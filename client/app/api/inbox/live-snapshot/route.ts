"use server";

import { NextResponse } from "next/server";
import { withAuth, RequestWithUser } from "@/lib/middleware/auth.middleware";
import { db } from "@/drizzle/index";
import { conversations } from "@/drizzle/schema/conversations";
import { messages } from "@/drizzle/schema/messages";
import { eq, desc } from "drizzle-orm";
import { generate } from "@/utils/generate";
import { parseUntilJson } from "@/utils/parse_until_json";
import { StatusCodes } from "http-status-codes";

// ────────────────────────────────────────────────────────────────
// System Prompt
// ────────────────────────────────────────────────────────────────

const LIVE_SNAPSHOT_SYSTEM_PROMPT = `You are a real-time collaborative assistant inside "Babble", a unified inbox platform.

You are given a stream of recent messages from a live conversation thread that may include customer messages, agent replies, and internal notes.

Produce a concise live snapshot in EXACTLY this JSON format:

{
  "currentGoal": "<1 sentence: what the team is currently trying to accomplish>",
  "decisionsMade": ["<string>"],
  "openQuestions": ["<string>"],
  "suggestedNextStep": "<1 sentence: the most impactful next action>",
  "unresolvedIssues": ["<string>"],
  "participantSummary": [
    { "name": "<string>", "lastAction": "<what they last said/did>" }
  ]
}

Rules:
- Be concise. Each array item should be 1 sentence max.
- Only report what is explicitly present in the conversation.
- If no decisions have been made, return an empty array.
- Focus on actionable insights, not recaps.
- The suggested next step should be specific enough for someone to act on immediately.`;

// ────────────────────────────────────────────────────────────────
// POST /api/inbox/live-snapshot
//
// Generate a live collaboration snapshot for a single conversation.
//
// Body:
//   - conversationId (required)
//   - limit (optional): how many recent messages to analyze (default 30)
// ────────────────────────────────────────────────────────────────

async function postHandler(request: RequestWithUser) {
  const user = request.user;
  if (user instanceof NextResponse) return user;

  try {
    const body = await request.json();
    const { conversationId, limit = 30 } = body;

    if (!conversationId) {
      return NextResponse.json(
        { error: "conversationId is required" },
        { status: StatusCodes.BAD_REQUEST }
      );
    }

    // Fetch the conversation
    const conv = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, Number(conversationId)))
      .limit(1);

    if (conv.length === 0) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: StatusCodes.NOT_FOUND }
      );
    }

    // Fetch recent messages
    const msgs = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, Number(conversationId)))
      .orderBy(desc(messages.createdAt))
      .limit(limit);

    if (msgs.length === 0) {
      return NextResponse.json({
        snapshot: {
          currentGoal: "No messages in this conversation yet.",
          decisionsMade: [],
          openQuestions: [],
          suggestedNextStep: "Wait for the first message.",
          unresolvedIssues: [],
          participantSummary: [],
        },
        metadata: {
          conversationId: Number(conversationId),
          messagesAnalyzed: 0,
          generatedAt: new Date().toISOString(),
        },
      });
    }

    const conversation = conv[0];
    const messageData = msgs.reverse().map((m) => ({
      senderType: m.senderType,
      direction: m.direction,
      body: m.body.substring(0, 800),
      channel: m.channel,
      createdAt: m.createdAt,
    }));

    const prompt = `Generate a live snapshot for this conversation.

CONVERSATION:
- Subject: ${conversation.subject || "(no subject)"}
- Channel: ${conversation.channel}
- Contact: ${conversation.contactName || conversation.contactIdentifier}
- Status: ${conversation.status}

MESSAGES (${messageData.length} most recent, chronological):
${JSON.stringify(messageData, null, 2)}`;

    const snapshotRaw = await generate(prompt, LIVE_SNAPSHOT_SYSTEM_PROMPT, {
      temperature: 0.2,
      maxTokens: 1024,
      responseFormat: { type: "json_object" },
    });

    const snapshot = parseUntilJson(snapshotRaw);

    return NextResponse.json({
      snapshot,
      metadata: {
        conversationId: Number(conversationId),
        messagesAnalyzed: msgs.length,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error generating live snapshot:", error);
    return NextResponse.json(
      { error: "Failed to generate live snapshot", details: (error as Error).message },
      { status: StatusCodes.INTERNAL_SERVER_ERROR }
    );
  }
}

export const POST = withAuth(postHandler);
