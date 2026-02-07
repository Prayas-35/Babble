'use server';

import { NextResponse } from 'next/server';
import { withAuth, RequestWithUser } from '@/lib/middleware/auth.middleware';
import { db } from '@/drizzle/index';
import { conversations } from '@/drizzle/schema/conversations';
import { messages } from '@/drizzle/schema/messages';
import { eq, desc } from 'drizzle-orm';
import { generate } from '@/utils/generate';
import { parseUntilJson } from '@/utils/parse_until_json';
import { StatusCodes } from 'http-status-codes';

// ────────────────────────────────────────────────────────────────
// System Prompts
// ────────────────────────────────────────────────────────────────

const SUMMARY_SYSTEM_PROMPT = `You are an AI operations assistant inside "Babble", a unified inbox and collaboration platform.

You will be given a batch of conversation messages from multiple channels (email, SMS, WhatsApp, Slack, web chat, internal notes).

Analyze ALL messages and produce a structured summary in EXACTLY this JSON format:

{
  "keyConversations": [
    { "conversationId": <number>, "subject": "<string>", "contactName": "<string>", "channel": "<string>", "gist": "<1-2 sentence summary>" }
  ],
  "importantUpdates": ["<string>"],
  "urgentItems": [
    { "conversationId": <number>, "reason": "<why it's urgent>", "requiredAction": "<what needs to happen>" }
  ],
  "risksOrBlockers": ["<string>"],
  "pendingDecisions": ["<string>"]
}

Rules:
- Be precise and factual. Only report what is explicitly stated in the messages.
- Mark items as urgent if they mention deadlines, escalation, or customer frustration.
- Keep each gist to 1-2 sentences max.
- If there are no urgent items or risks, return empty arrays.
- Do NOT hallucinate or invent data not present in the messages.`;

const ACTIONS_SYSTEM_PROMPT = `You are an AI operations assistant inside "Babble", a unified inbox and collaboration platform.

You will be given:
1. A structured summary of recent inbox activity
2. The raw conversation data

Based on this, suggest concrete actions the team should take. Return EXACTLY this JSON format:

{
  "suggestedActions": [
    {
      "type": "<action type>",
      "title": "<short action title>",
      "description": "<why this action is useful>",
      "conversationId": <number or null>,
      "priority": "<low | medium | high | urgent>",
      "requiredInputs": ["<what's needed to execute>"]
    }
  ]
}

Action types (use exactly these strings):
- "send_followup" — Send a follow-up message to a customer or participant
- "create_task" — Create a task on the task board
- "assign_task" — Assign a conversation or task to a team member
- "schedule_reminder" — Set a reminder for a future date
- "escalate" — Escalate to admin or manager
- "draft_reply" — Draft a reply (do not send)
- "broadcast" — Send a circular message to multiple contacts

Rules:
- Prioritize actions that reduce manual work, prevent delays, and improve response time.
- Always suggest "draft_reply" instead of "send_followup" when the conversation is complex.
- Never suggest destructive actions (deleting conversations, removing team members).
- Maximum 6 suggested actions. Quality over quantity.
- Every action must reference a specific conversationId when applicable.`;

// ────────────────────────────────────────────────────────────────
// POST /api/inbox/analyze
//
// Analyzes all recent conversations for an organization and returns
// a structured summary + suggested actions.
//
// Body:
//   - organizationId (required)
//   - conversationIds (optional): array of specific IDs to analyze
//   - limit (optional): max conversations to analyze (default 20)
// ────────────────────────────────────────────────────────────────

async function postHandler(request: RequestWithUser) {
  const user = request.user;
  if (user instanceof NextResponse) return user;

  try {
    const body = await request.json();
    const { organizationId, conversationIds, limit = 20 } = body;

    if (!organizationId) {
      return NextResponse.json(
        { error: 'organizationId is required' },
        { status: StatusCodes.BAD_REQUEST },
      );
    }

    // ── Step 1: Fetch conversations ──────────────────────────────

    let convos;
    if (conversationIds && conversationIds.length > 0) {
      // Fetch specific conversations
      const results = [];
      for (const id of conversationIds.slice(0, limit)) {
        const conv = await db
          .select()
          .from(conversations)
          .where(eq(conversations.id, Number(id)))
          .limit(1);
        if (conv.length > 0) results.push(conv[0]);
      }
      convos = results;
    } else {
      convos = await db
        .select()
        .from(conversations)
        .where(eq(conversations.organizationId, Number(organizationId)))
        .orderBy(desc(conversations.updatedAt))
        .limit(limit);
    }

    if (convos.length === 0) {
      return NextResponse.json({
        summary: {
          keyConversations: [],
          importantUpdates: [],
          urgentItems: [],
          risksOrBlockers: [],
          pendingDecisions: [],
        },
        suggestedActions: [],
        metadata: { conversationsAnalyzed: 0 },
      });
    }

    // ── Step 2: Fetch messages for each conversation ─────────────

    const conversationData = [];
    for (const conv of convos) {
      const msgs = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conv.id))
        .orderBy(desc(messages.createdAt))
        .limit(50); // Last 50 messages per conversation

      conversationData.push({
        conversationId: conv.id,
        channel: conv.channel,
        status: conv.status,
        subject: conv.subject,
        contactName: conv.contactName,
        contactIdentifier: conv.contactIdentifier,
        messages: msgs.map((m) => ({
          senderType: m.senderType,
          direction: m.direction,
          body: m.body,
          createdAt: m.createdAt,
        })),
      });
    }

    // ── Step 3: Generate summary via LLM ─────────────────────────

    const summaryPrompt = `Analyze the following ${conversationData.length} conversations from our unified inbox and produce a structured summary.

CONVERSATIONS:
${JSON.stringify(conversationData, null, 2)}`;

    const summaryRaw = await generate(summaryPrompt, SUMMARY_SYSTEM_PROMPT, {
      temperature: 0.2,
      maxTokens: 2048,
      responseFormat: { type: 'json_object' },
    });

    const summary = parseUntilJson(summaryRaw);

    // ── Step 4: Generate suggested actions via LLM ───────────────

    const actionsPrompt = `Based on the following inbox summary and raw conversation data, suggest concrete actions the team should take.

SUMMARY:
${JSON.stringify(summary, null, 2)}

RAW CONVERSATIONS:
${JSON.stringify(conversationData, null, 2)}`;

    const actionsRaw = await generate(actionsPrompt, ACTIONS_SYSTEM_PROMPT, {
      temperature: 0.3,
      maxTokens: 1536,
      responseFormat: { type: 'json_object' },
    });

    const actions = parseUntilJson(actionsRaw);

    // ── Step 5: Return combined result ───────────────────────────

    return NextResponse.json({
      summary,
      suggestedActions: actions.suggestedActions || [],
      metadata: {
        conversationsAnalyzed: convos.length,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error analyzing inbox:', error);
    return NextResponse.json(
      { error: 'Failed to analyze inbox', details: (error as Error).message },
      { status: StatusCodes.INTERNAL_SERVER_ERROR },
    );
  }
}

export const POST = withAuth(postHandler);
