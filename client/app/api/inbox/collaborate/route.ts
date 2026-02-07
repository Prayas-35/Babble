'use server';

import { NextResponse } from 'next/server';
import { withAuth, RequestWithUser } from '@/lib/middleware/auth.middleware';
import { db } from '@/drizzle/index';
import { collaborationSessions } from '@/drizzle/schema/collaboration_sessions';
import { conversations } from '@/drizzle/schema/conversations';
import { eq, and, desc } from 'drizzle-orm';
import { StatusCodes } from 'http-status-codes';

/**
 * GET /api/inbox/collaborate
 *
 * List active collaboration sessions.
 * Query params:
 *   - conversationId (optional): filter by conversation
 */
async function getHandler(request: RequestWithUser) {
  const user = request.user;
  if (user instanceof NextResponse) return user;

  try {
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');

    let results;
    if (conversationId) {
      results = await db
        .select()
        .from(collaborationSessions)
        .where(
          and(
            eq(collaborationSessions.conversationId, Number(conversationId)),
            eq(collaborationSessions.isActive, true),
          ),
        )
        .orderBy(desc(collaborationSessions.updatedAt));
    } else {
      results = await db
        .select()
        .from(collaborationSessions)
        .where(eq(collaborationSessions.isActive, true))
        .orderBy(desc(collaborationSessions.updatedAt));
    }

    return NextResponse.json({ sessions: results });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch collaboration sessions' },
      { status: StatusCodes.INTERNAL_SERVER_ERROR },
    );
  }
}

/**
 * POST /api/inbox/collaborate
 *
 * Create a new collaboration session (start live assist).
 * Body:
 *   - conversationId (required)
 */
async function postHandler(request: RequestWithUser) {
  const user = request.user;
  if (user instanceof NextResponse) return user;

  try {
    const body = await request.json();
    const { conversationId } = body;

    if (!conversationId) {
      return NextResponse.json(
        { error: 'conversationId is required' },
        { status: StatusCodes.BAD_REQUEST },
      );
    }

    // Verify conversation exists
    const conv = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(eq(conversations.id, Number(conversationId)))
      .limit(1);

    if (conv.length === 0) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: StatusCodes.NOT_FOUND },
      );
    }

    // Check for existing active session on this conversation
    const existing = await db
      .select()
      .from(collaborationSessions)
      .where(
        and(
          eq(collaborationSessions.conversationId, Number(conversationId)),
          eq(collaborationSessions.isActive, true),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      // Return the existing active session
      return NextResponse.json({ session: existing[0] });
    }

    // Create new session with empty meeting memory
    const initialMemory = {
      decisions: [] as string[],
      openQuestions: [] as string[],
      actionItems: [] as string[],
      keyPoints: [] as string[],
      snapshotCount: 0,
    };

    const newSession = await db
      .insert(collaborationSessions)
      .values({
        conversationId: Number(conversationId),
        createdBy: 0, // TODO: map Supabase user to local user ID
        memory: initialMemory,
      })
      .returning();

    return NextResponse.json(
      { session: newSession[0] },
      { status: StatusCodes.CREATED },
    );
  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json(
      { error: 'Failed to create collaboration session' },
      { status: StatusCodes.INTERNAL_SERVER_ERROR },
    );
  }
}

export const GET = withAuth(getHandler);
export const POST = withAuth(postHandler);
