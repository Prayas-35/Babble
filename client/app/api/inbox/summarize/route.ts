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
// System prompt — lightweight per-conversation summary
// ────────────────────────────────────────────────────────────────

const CONVERSATION_SUMMARY_PROMPT = `You are an AI assistant inside "Babble", a unified inbox platform.

You will receive a single conversation thread with its messages. Produce a concise summary in EXACTLY this JSON format:

{
  "summary": "<2-3 sentence overview of the entire conversation — what it's about, current status, key points>",
  "sentiment": "<positive | neutral | negative | mixed>",
  "keyPoints": ["<important fact or decision>", "..."],
  "nextSteps": [
    { "action": "<concrete next step>", "owner": "<who should do it — 'you' or the contact name>", "priority": "<low | medium | high | urgent>" }
  ],
  "pendingQuestions": ["<any unanswered questions from either side>"]
}

Rules:
- Be precise and factual. Only report what is explicitly stated in the messages.
- "summary" must be 2-3 sentences — succinct but complete.
- "keyPoints" — max 5 bullet points of the most important facts/decisions.
- "nextSteps" — max 4 concrete actions. Each must be actionable, not vague.
- "pendingQuestions" — questions that still need answers. Empty array if none.
- Do NOT invent information not present in the messages.`;

// ────────────────────────────────────────────────────────────────
// POST /api/inbox/summarize
//
// Generates a focused summary + next steps for a single conversation.
// Body:
//   - conversationId (required)
// ────────────────────────────────────────────────────────────────

async function postHandler(request: RequestWithUser) {
  const user = request.user;
  if (user instanceof NextResponse) return user;

  try {
    const body = await request.json();
    const { conversationId } = body;

    if (!conversationId) {
      return NextResponse.json(
        { error: "conversationId is required" },
        { status: StatusCodes.BAD_REQUEST }
      );
    }

    // Fetch the conversation
    const [conv] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, Number(conversationId)))
      .limit(1);

    if (!conv) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: StatusCodes.NOT_FOUND }
      );
    }

    // Fetch messages
    const msgs = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conv.id))
      .orderBy(desc(messages.createdAt))
      .limit(50);

    if (msgs.length === 0) {
      return NextResponse.json({
        insights: {
          summary: "No messages in this conversation yet.",
          sentiment: "neutral",
          keyPoints: [],
          nextSteps: [],
          pendingQuestions: [],
        },
      });
    }

    // Build context for the LLM
    const conversationData = {
      conversationId: conv.id,
      channel: conv.channel,
      status: conv.status,
      subject: conv.subject,
      contactName: conv.contactName,
      contactIdentifier: conv.contactIdentifier,
      messages: msgs.reverse().map((m) => ({
        senderType: m.senderType,
        direction: m.direction,
        body: m.body,
        createdAt: m.createdAt,
      })),
    };

    const prompt = `Analyze this conversation and produce a summary with next steps.

CONVERSATION:
Subject: ${conv.subject || "(no subject)"}
Contact: ${conv.contactName || conv.contactIdentifier}
Channel: ${conv.channel}
Status: ${conv.status}
Messages (${msgs.length}):
${JSON.stringify(conversationData.messages, null, 2)}`;

    const raw = await generate(prompt, CONVERSATION_SUMMARY_PROMPT, {
      temperature: 0.2,
      maxTokens: 1024,
      responseFormat: { type: "json_object" },
    });

    const insights = parseUntilJson(raw);

    return NextResponse.json({ insights });
  } catch (error) {
    console.error("Error summarizing conversation:", error);
    return NextResponse.json(
      { error: "Failed to summarize conversation", details: (error as Error).message },
      { status: StatusCodes.INTERNAL_SERVER_ERROR }
    );
  }
}

export const POST = withAuth(postHandler);
