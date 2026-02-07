'use server';

import { NextResponse } from 'next/server';
import { withAuth, RequestWithUser } from '@/lib/middleware/auth.middleware';
import { db } from '@/drizzle/index';
import { conversations } from '@/drizzle/schema/conversations';
import { messages } from '@/drizzle/schema/messages';
import { providerAccounts } from '@/drizzle/schema/provider_acounts';
import { eq, and } from 'drizzle-orm';
import { StatusCodes } from 'http-status-codes';

// ────────────────────────────────────────────────────────────────
// HTML → Plain Text helper
// ────────────────────────────────────────────────────────────────

function htmlToPlainText(html: string): string {
  let text = html;
  // Remove <style> and <script> blocks entirely
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  // Replace <br>, <br/>, <br /> with a single newline
  text = text.replace(/<br\s*\/?>/gi, '\n');
  // Replace closing block tags with a single newline
  text = text.replace(/<\/(p|div|tr|li|h[1-6]|blockquote)>/gi, '\n');
  // Replace <hr> with a separator
  text = text.replace(/<hr\s*\/?>/gi, '\n---\n');
  // Strip all remaining HTML tags
  text = text.replace(/<[^>]+>/g, '');
  // Decode common HTML entities
  text = text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"');
  // Decode all numeric entities: &#8202; &#39; &#x27; etc.
  text = text.replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16)),
  );
  text = text.replace(/&#(\d+);/g, (_, dec) =>
    String.fromCharCode(Number(dec)),
  );
  // Collapse 2+ consecutive newlines into a single newline
  text = text.replace(/\n{2,}/g, '\n');
  // Remove blank lines that are just whitespace
  text = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join('\n')
    .trim();
  return text;
}

// ────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────

interface OutlookMessage {
  id: string;
  subject: string;
  bodyPreview: string;
  body: { contentType: string; content: string };
  from: { emailAddress: { name: string; address: string } };
  toRecipients: { emailAddress: { name: string; address: string } }[];
  receivedDateTime: string;
  isRead: boolean;
}

interface GmailThread {
  id: string;
  messages: GmailMessage[];
}

interface GmailMessage {
  id: string;
  payload: {
    headers: { name: string; value: string }[];
    body: { data?: string };
    parts?: { mimeType: string; body: { data?: string } }[];
  };
  internalDate: string;
}

interface IngestResult {
  conversationsCreated: number;
  messagesCreated: number;
  errors: string[];
}

// ────────────────────────────────────────────────────────────────
// Outlook (Microsoft Graph) ingestion
// ────────────────────────────────────────────────────────────────

async function fetchOutlookMessages(
  accessToken: string,
): Promise<OutlookMessage[]> {
  const response = await fetch(
    'https://graph.microsoft.com/v1.0/me/messages?$top=25&$orderby=receivedDateTime desc&$select=id,subject,bodyPreview,body,from,toRecipients,receivedDateTime,isRead',
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Outlook API error (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  return data.value as OutlookMessage[];
}

async function ingestOutlookMessages(
  outlookMessages: OutlookMessage[],
  organizationId: number,
): Promise<IngestResult> {
  let conversationsCreated = 0;
  let messagesCreated = 0;
  const errors: string[] = [];

  for (const msg of outlookMessages) {
    try {
      const contactEmail = msg.from.emailAddress.address;
      const contactName = msg.from.emailAddress.name;
      const subject = msg.subject;

      // Check if a conversation already exists for this contact + subject
      const existing = await db
        .select()
        .from(conversations)
        .where(
          and(
            eq(conversations.organizationId, organizationId),
            eq(conversations.contactIdentifier, contactEmail),
            eq(conversations.channel, 'email'),
          ),
        )
        .limit(1);

      let conversationId: number;

      if (existing.length > 0 && existing[0].subject === subject) {
        conversationId = existing[0].id;
      } else {
        const newConv = await db
          .insert(conversations)
          .values({
            organizationId,
            channel: 'email',
            contactIdentifier: contactEmail,
            contactName,
            subject,
          })
          .returning();
        conversationId = newConv[0].id;
        conversationsCreated++;
      }

      // Check if this message was already ingested (by externalId)
      const existingMsg = await db
        .select({ id: messages.id })
        .from(messages)
        .where(eq(messages.externalId, msg.id))
        .limit(1);

      if (existingMsg.length > 0) continue;

      // Insert the message
      await db.insert(messages).values({
        conversationId,
        senderType: 'customer',
        senderId: null,
        channel: 'email',
        direction: 'inbound',
        body: htmlToPlainText(msg.body.content || msg.bodyPreview),
        metadata: {
          isRead: msg.isRead,
          contentType: msg.body.contentType,
          toRecipients: msg.toRecipients,
        },
        externalId: msg.id,
        createdAt: new Date(msg.receivedDateTime),
      });

      messagesCreated++;

      // Touch conversation
      await db
        .update(conversations)
        .set({ updatedAt: new Date(msg.receivedDateTime) })
        .where(eq(conversations.id, conversationId));
    } catch (err) {
      errors.push(`Outlook msg ${msg.id}: ${(err as Error).message}`);
    }
  }

  return { conversationsCreated, messagesCreated, errors };
}

// ────────────────────────────────────────────────────────────────
// Gmail ingestion
// ────────────────────────────────────────────────────────────────

async function fetchGmailMessages(accessToken: string): Promise<GmailThread[]> {
  // Step 1: list recent threads
  const listRes = await fetch(
    'https://gmail.googleapis.com/gmail/v1/users/me/threads?maxResults=25',
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (!listRes.ok) {
    const errorBody = await listRes.text();
    throw new Error(`Gmail list error (${listRes.status}): ${errorBody}`);
  }

  const listData = await listRes.json();
  const threadIds: string[] = (listData.threads || []).map(
    (t: { id: string }) => t.id,
  );

  // Step 2: fetch each thread's messages
  const threads: GmailThread[] = [];
  for (const threadId of threadIds.slice(0, 25)) {
    const threadRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}?format=full`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (threadRes.ok) {
      threads.push(await threadRes.json());
    }
  }

  return threads;
}

function decodeBase64Url(data: string): string {
  const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(base64, 'base64').toString('utf-8');
}

function extractGmailBody(message: GmailMessage): string {
  // Try parts first (multipart messages)
  if (message.payload.parts) {
    const textPart = message.payload.parts.find(
      (p) => p.mimeType === 'text/plain',
    );
    if (textPart?.body?.data) {
      return decodeBase64Url(textPart.body.data);
    }
    const htmlPart = message.payload.parts.find(
      (p) => p.mimeType === 'text/html',
    );
    if (htmlPart?.body?.data) {
      return decodeBase64Url(htmlPart.body.data);
    }
  }
  // Fall back to body.data
  if (message.payload.body?.data) {
    return decodeBase64Url(message.payload.body.data);
  }
  return '';
}

function getGmailHeader(message: GmailMessage, name: string): string {
  const header = message.payload.headers.find(
    (h) => h.name.toLowerCase() === name.toLowerCase(),
  );
  return header?.value || '';
}

async function ingestGmailThreads(
  threads: GmailThread[],
  organizationId: number,
): Promise<IngestResult> {
  let conversationsCreated = 0;
  let messagesCreated = 0;
  const errors: string[] = [];

  for (const thread of threads) {
    try {
      if (!thread.messages || thread.messages.length === 0) continue;

      const firstMsg = thread.messages[0];
      const from = getGmailHeader(firstMsg, 'From');
      const subject = getGmailHeader(firstMsg, 'Subject');

      // Parse email from "Name <email>" format
      const emailMatch = from.match(/<(.+?)>/);
      const contactEmail = emailMatch ? emailMatch[1] : from;
      const contactName = emailMatch ? from.replace(/<.+?>/, '').trim() : from;

      // Find or create conversation
      const existing = await db
        .select()
        .from(conversations)
        .where(
          and(
            eq(conversations.organizationId, organizationId),
            eq(conversations.contactIdentifier, contactEmail),
            eq(conversations.channel, 'email'),
          ),
        )
        .limit(1);

      let conversationId: number;

      if (existing.length > 0 && existing[0].subject === subject) {
        conversationId = existing[0].id;
      } else {
        const newConv = await db
          .insert(conversations)
          .values({
            organizationId,
            channel: 'email',
            contactIdentifier: contactEmail,
            contactName,
            subject,
          })
          .returning();
        conversationId = newConv[0].id;
        conversationsCreated++;
      }

      // Insert each message in the thread
      for (const gmailMsg of thread.messages) {
        // Dedup by external ID
        const existingMsg = await db
          .select({ id: messages.id })
          .from(messages)
          .where(eq(messages.externalId, gmailMsg.id))
          .limit(1);

        if (existingMsg.length > 0) continue;

        const body = htmlToPlainText(extractGmailBody(gmailMsg));
        const msgFrom = getGmailHeader(gmailMsg, 'From');

        await db.insert(messages).values({
          conversationId,
          senderType: 'customer',
          senderId: null,
          channel: 'email',
          direction: 'inbound',
          body,
          metadata: {
            from: msgFrom,
            to: getGmailHeader(gmailMsg, 'To'),
            date: getGmailHeader(gmailMsg, 'Date'),
          },
          externalId: gmailMsg.id,
          createdAt: new Date(Number(gmailMsg.internalDate)),
        });

        messagesCreated++;
      }

      // Touch conversation updatedAt with latest message time
      const lastMsg = thread.messages[thread.messages.length - 1];
      await db
        .update(conversations)
        .set({ updatedAt: new Date(Number(lastMsg.internalDate)) })
        .where(eq(conversations.id, conversationId));
    } catch (err) {
      errors.push(`Gmail thread ${thread.id}: ${(err as Error).message}`);
    }
  }

  return { conversationsCreated, messagesCreated, errors };
}

// ────────────────────────────────────────────────────────────────
// POST /api/inbox/ingest
//
// Fetches messages from connected provider(s) and persists them.
// Body:
//   - organizationId (required)
//   - provider (required): "outlook" | "google"
//   - accessToken (required): OAuth token for the provider
// ────────────────────────────────────────────────────────────────

async function postHandler(request: RequestWithUser) {
  const user = request.user;
  if (user instanceof NextResponse) return user;

  try {
    const body = await request.json();
    const { organizationId, provider, accessToken } = body;

    if (!organizationId || !provider || !accessToken) {
      return NextResponse.json(
        { error: 'organizationId, provider, and accessToken are required' },
        { status: StatusCodes.BAD_REQUEST },
      );
    }

    let result: IngestResult;

    switch (provider) {
      case 'outlook': {
        const outlookMessages = await fetchOutlookMessages(accessToken);
        result = await ingestOutlookMessages(
          outlookMessages,
          Number(organizationId),
        );
        break;
      }

      case 'google': {
        const gmailThreads = await fetchGmailMessages(accessToken);
        result = await ingestGmailThreads(gmailThreads, Number(organizationId));
        break;
      }

      default:
        return NextResponse.json(
          {
            error: `Unsupported provider: ${provider}. Use "outlook" or "google".`,
          },
          { status: StatusCodes.BAD_REQUEST },
        );
    }

    return NextResponse.json({
      success: true,
      provider,
      conversationsCreated: result.conversationsCreated,
      messagesCreated: result.messagesCreated,
      errors: result.errors,
    });
  } catch (error) {
    console.error('Error during message ingestion:', error);
    return NextResponse.json(
      { error: 'Failed to ingest messages', details: (error as Error).message },
      { status: StatusCodes.INTERNAL_SERVER_ERROR },
    );
  }
}

export const POST = withAuth(postHandler);
