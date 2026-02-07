'use server';

import { NextResponse } from 'next/server';
import { withAuth, RequestWithUser } from '@/lib/middleware/auth.middleware';
import { db } from '@/drizzle/index';
import {
  collaborationSessions,
  collaborationEntries,
} from '@/drizzle/schema/collaboration_sessions';
import { eq, desc } from 'drizzle-orm';
import { StatusCodes } from 'http-status-codes';

interface RouteContext {
  params: Promise<{ sessionId: string }>;
}

/**
 * GET /api/inbox/collaborate/[sessionId]
 *
 * Get a session's full details including entries and meeting memory.
 */
async function getHandler(request: RequestWithUser, context: RouteContext) {
  const user = request.user;
  if (user instanceof NextResponse) return user;

  try {
    const { sessionId } = await context.params;

    const session = await db
      .select()
      .from(collaborationSessions)
      .where(eq(collaborationSessions.id, Number(sessionId)))
      .limit(1);

    if (session.length === 0) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: StatusCodes.NOT_FOUND },
      );
    }

    const entries = await db
      .select()
      .from(collaborationEntries)
      .where(eq(collaborationEntries.sessionId, Number(sessionId)))
      .orderBy(desc(collaborationEntries.createdAt));

    return NextResponse.json({
      session: session[0],
      entries,
    });
  } catch (error) {
    console.error('Error fetching session:', error);
    return NextResponse.json(
      { error: 'Failed to fetch session' },
      { status: StatusCodes.INTERNAL_SERVER_ERROR },
    );
  }
}

/**
 * PATCH /api/inbox/collaborate/[sessionId]
 *
 * End a collaboration session (set isActive = false).
 */
async function patchHandler(request: RequestWithUser, context: RouteContext) {
  const user = request.user;
  if (user instanceof NextResponse) return user;

  try {
    const { sessionId } = await context.params;
    const body = await request.json();

    const updates: Record<string, unknown> = { updatedAt: new Date() };

    if (body.isActive !== undefined) {
      updates.isActive = body.isActive;
    }

    if (body.memory !== undefined) {
      updates.memory = body.memory;
    }

    const updated = await db
      .update(collaborationSessions)
      .set(updates)
      .where(eq(collaborationSessions.id, Number(sessionId)))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: StatusCodes.NOT_FOUND },
      );
    }

    return NextResponse.json({ session: updated[0] });
  } catch (error) {
    console.error('Error updating session:', error);
    return NextResponse.json(
      { error: 'Failed to update session' },
      { status: StatusCodes.INTERNAL_SERVER_ERROR },
    );
  }
}

export const GET = withAuth(getHandler);
export const PATCH = withAuth(patchHandler);
