"use server";

import { NextResponse } from "next/server";
import { withAuth, RequestWithUser } from "@/lib/middleware/auth.middleware";
import { db } from "@/drizzle/index";
import {
  collaborationSessions,
  collaborationEntries,
} from "@/drizzle/schema/collaboration_sessions";
import { eq } from "drizzle-orm";
import { StatusCodes } from "http-status-codes";

interface RouteContext {
  params: Promise<{ sessionId: string }>;
}

/**
 * POST /api/inbox/collaborate/[sessionId]/entries
 *
 * Add a note, decision, question, or action item to the session.
 * Body:
 *   - entryType (required): "decision" | "note" | "question" | "action_item"
 *   - content (required): string
 *   - metadata (optional): any extra data
 */
async function postHandler(request: RequestWithUser, context: RouteContext) {
  const user = request.user;
  if (user instanceof NextResponse) return user;

  try {
    const { sessionId } = await context.params;
    const body = await request.json();
    const { entryType, content, metadata } = body;

    if (!entryType || !content) {
      return NextResponse.json(
        { error: "entryType and content are required" },
        { status: StatusCodes.BAD_REQUEST }
      );
    }

    const validTypes = ["decision", "note", "question", "action_item"];
    if (!validTypes.includes(entryType)) {
      return NextResponse.json(
        { error: `entryType must be one of: ${validTypes.join(", ")}` },
        { status: StatusCodes.BAD_REQUEST }
      );
    }

    // Verify session exists and is active
    const session = await db
      .select()
      .from(collaborationSessions)
      .where(eq(collaborationSessions.id, Number(sessionId)))
      .limit(1);

    if (session.length === 0) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: StatusCodes.NOT_FOUND }
      );
    }

    if (!session[0].isActive) {
      return NextResponse.json(
        { error: "Session is no longer active" },
        { status: StatusCodes.CONFLICT }
      );
    }

    // Insert the entry
    const newEntry = await db
      .insert(collaborationEntries)
      .values({
        sessionId: Number(sessionId),
        userId: 0, // TODO: map Supabase user to local user ID
        entryType,
        content,
        metadata: metadata || null,
      })
      .returning();

    // Update meeting memory by appending to the relevant array
    const memory = (session[0].memory as Record<string, unknown>) || {};
    const memoryKey =
      entryType === "decision"
        ? "decisions"
        : entryType === "question"
        ? "openQuestions"
        : entryType === "action_item"
        ? "actionItems"
        : "keyPoints";

    const currentList = (memory[memoryKey] as string[]) || [];
    currentList.push(content);

    await db
      .update(collaborationSessions)
      .set({
        memory: { ...memory, [memoryKey]: currentList },
        updatedAt: new Date(),
      })
      .where(eq(collaborationSessions.id, Number(sessionId)));

    return NextResponse.json(
      { entry: newEntry[0] },
      { status: StatusCodes.CREATED }
    );
  } catch (error) {
    console.error("Error adding entry:", error);
    return NextResponse.json(
      { error: "Failed to add entry" },
      { status: StatusCodes.INTERNAL_SERVER_ERROR }
    );
  }
}

export const POST = withAuth(postHandler);
