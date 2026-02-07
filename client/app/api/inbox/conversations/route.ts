'use server';

import { NextResponse } from 'next/server';
import { withAuth, RequestWithUser } from '@/lib/middleware/auth.middleware';
import { db } from '@/drizzle/index';
import { conversations } from '@/drizzle/schema/conversations';
import { eq, and, desc } from 'drizzle-orm';
import { StatusCodes } from 'http-status-codes';

/**
 * GET /api/inbox/conversations
 *
 * List conversations for an organization.
 * Query params:
 *   - organizationId (required)
 *   - status (optional): open | closed | snoozed | archived
 *   - channel (optional): email | sms | whatsapp | slack | web_chat | internal_note
 */
async function getHandler(request: RequestWithUser) {
  const user = request.user;
  if (user instanceof NextResponse) return user;

  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');

    if (!organizationId) {
      return NextResponse.json(
        { error: 'organizationId is required' },
        { status: StatusCodes.BAD_REQUEST },
      );
    }

    const filters = [eq(conversations.organizationId, Number(organizationId))];

    const status = searchParams.get('status');
    if (status) {
      filters.push(
        eq(
          conversations.status,
          status as 'open' | 'closed' | 'snoozed' | 'archived',
        ),
      );
    }

    const channel = searchParams.get('channel');
    if (channel) {
      filters.push(
        eq(
          conversations.channel,
          channel as
            | 'email'
            | 'sms'
            | 'whatsapp'
            | 'slack'
            | 'web_chat'
            | 'internal_note',
        ),
      );
    }

    const results = await db
      .select()
      .from(conversations)
      .where(and(...filters))
      .orderBy(desc(conversations.updatedAt));

    return NextResponse.json({ conversations: results });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: StatusCodes.INTERNAL_SERVER_ERROR },
    );
  }
}

/**
 * POST /api/inbox/conversations
 *
 * Create a new conversation.
 * Body:
 *   - organizationId (required)
 *   - channel (required)
 *   - contactIdentifier (required)
 *   - subject (optional)
 *   - contactName (optional)
 *   - assignedTo (optional)
 */
async function postHandler(request: RequestWithUser) {
  const user = request.user;
  if (user instanceof NextResponse) return user;

  try {
    const body = await request.json();
    const {
      organizationId,
      channel,
      contactIdentifier,
      subject,
      contactName,
      assignedTo,
    } = body;

    if (!organizationId || !channel || !contactIdentifier) {
      return NextResponse.json(
        {
          error: 'organizationId, channel, and contactIdentifier are required',
        },
        { status: StatusCodes.BAD_REQUEST },
      );
    }

    const validChannels = [
      'email',
      'sms',
      'whatsapp',
      'slack',
      'web_chat',
      'internal_note',
    ];
    if (!validChannels.includes(channel)) {
      return NextResponse.json(
        {
          error: `Invalid channel. Must be one of: ${validChannels.join(', ')}`,
        },
        { status: StatusCodes.BAD_REQUEST },
      );
    }

    const newConversation = await db
      .insert(conversations)
      .values({
        organizationId: Number(organizationId),
        channel,
        contactIdentifier,
        subject: subject || null,
        contactName: contactName || null,
        assignedTo: assignedTo ? Number(assignedTo) : null,
      })
      .returning();

    return NextResponse.json(
      { conversation: newConversation[0] },
      { status: StatusCodes.CREATED },
    );
  } catch (error) {
    console.error('Error creating conversation:', error);
    return NextResponse.json(
      { error: 'Failed to create conversation' },
      { status: StatusCodes.INTERNAL_SERVER_ERROR },
    );
  }
}

export const GET = withAuth(getHandler);
export const POST = withAuth(postHandler);
