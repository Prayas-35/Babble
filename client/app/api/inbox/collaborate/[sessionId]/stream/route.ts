import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { db } from "@/drizzle/index";
import { collaborationSessions, collaborationEntries } from "@/drizzle/schema/collaboration_sessions";
import { conversations } from "@/drizzle/schema/conversations";
import { messages } from "@/drizzle/schema/messages";
import { eq, desc, gt } from "drizzle-orm";
import { generate } from "@/utils/generate";
import { parseUntilJson } from "@/utils/parse_until_json";

// ────────────────────────────────────────────────────────────────
// System Prompt for incremental live snapshots
// ────────────────────────────────────────────────────────────────

const COLLAB_SYSTEM_PROMPT = `You are a real-time collaborative assistant inside "Babble", a unified inbox platform.

You are given:
1. An existing meeting memory (accumulated decisions, open questions, action items, key points)
2. New messages that arrived since the last snapshot
3. Conversation context

Your job is to produce an UPDATED live snapshot that incorporates the new messages into the running meeting memory.

Return EXACTLY this JSON:

{
  "currentGoal": "<1 sentence>",
  "decisionsMade": ["<string>"],
  "openQuestions": ["<string>"],
  "suggestedNextStep": "<1 sentence>",
  "unresolvedIssues": ["<string>"],
  "participantSummary": [
    { "name": "<string>", "lastAction": "<string>" }
  ],
  "newInsights": ["<string — only things learned from the NEW messages>"],
  "memoryUpdate": {
    "decisions": ["<cumulative list of all decisions, old + new>"],
    "openQuestions": ["<cumulative, remove resolved questions, add new>"],
    "actionItems": ["<cumulative list>"],
    "keyPoints": ["<cumulative list>"]
  }
}

Rules:
- MERGE new information with existing memory — don't discard prior context.
- Remove questions from openQuestions if they were answered in new messages.
- Be concise. 1 sentence per array item.
- Only add to newInsights what is genuinely new from the latest messages.
- If no new messages, return the existing state unchanged.`;

interface RouteContext {
  params: Promise<{ sessionId: string }>;
}

/**
 * GET /api/inbox/collaborate/[sessionId]/stream
 *
 * Server-Sent Events endpoint for live collaboration.
 * Polls for new messages every few seconds and generates incremental
 * AI snapshots, streaming them back to the client.
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const { sessionId } = await context.params;

  // ── Auth check ──────────────────────────────────────────────
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Missing auth token" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const accessToken = authHeader.replace("Bearer ", "");
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
  if (!user || authError) {
    return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // ── Verify session exists ───────────────────────────────────
  const session = await db
    .select()
    .from(collaborationSessions)
    .where(eq(collaborationSessions.id, Number(sessionId)))
    .limit(1);

  if (session.length === 0) {
    return new Response(JSON.stringify({ error: "Session not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  // ── SSE stream ──────────────────────────────────────────────
  const encoder = new TextEncoder();
  const POLL_INTERVAL_MS = 8000; // Check for new messages every 8 seconds
  const MAX_STREAM_DURATION_MS = 5 * 60 * 1000; // 5 minute max stream

  const stream = new ReadableStream({
    async start(controller) {
      const startTime = Date.now();
      let lastProcessedId = session[0].lastProcessedMessageId || 0;
      let currentMemory = (session[0].memory as Record<string, unknown>) || {};
      let isActive = true;

      // Send initial connection event
      controller.enqueue(
        encoder.encode(`event: connected\ndata: ${JSON.stringify({ sessionId: Number(sessionId), startedAt: new Date().toISOString() })}\n\n`)
      );

      const poll = async () => {
        while (isActive && Date.now() - startTime < MAX_STREAM_DURATION_MS) {
          try {
            // Check if session is still active
            const currentSession = await db
              .select()
              .from(collaborationSessions)
              .where(eq(collaborationSessions.id, Number(sessionId)))
              .limit(1);

            if (currentSession.length === 0 || !currentSession[0].isActive) {
              controller.enqueue(
                encoder.encode(`event: session_ended\ndata: ${JSON.stringify({ reason: "Session ended" })}\n\n`)
              );
              isActive = false;
              break;
            }

            // Fetch the conversation for this session
            const conv = await db
              .select()
              .from(conversations)
              .where(eq(conversations.id, currentSession[0].conversationId))
              .limit(1);

            if (conv.length === 0) break;

            // Fetch new messages since last processed
            const newMsgs = await db
              .select()
              .from(messages)
              .where(
                lastProcessedId > 0
                  ? gt(messages.id, lastProcessedId)
                  : eq(messages.conversationId, currentSession[0].conversationId)
              )
              .orderBy(desc(messages.createdAt))
              .limit(20);

            // Also fetch recent entries (manual notes/decisions)
            const recentEntries = await db
              .select()
              .from(collaborationEntries)
              .where(eq(collaborationEntries.sessionId, Number(sessionId)))
              .orderBy(desc(collaborationEntries.createdAt))
              .limit(10);

            // Filter messages to only this conversation
            const relevantMsgs = newMsgs.filter(
              (m) => m.conversationId === currentSession[0].conversationId
            );

            if (relevantMsgs.length > 0 || recentEntries.length > 0) {
              // ── Generate incremental snapshot ─────────────

              const messageData = relevantMsgs.reverse().map((m) => ({
                id: m.id,
                senderType: m.senderType,
                direction: m.direction,
                body: m.body.substring(0, 600),
                channel: m.channel,
                createdAt: m.createdAt,
              }));

              const entriesData = recentEntries.map((e) => ({
                type: e.entryType,
                content: e.content,
                createdAt: e.createdAt,
              }));

              const prompt = `Generate an updated live snapshot.

CONVERSATION:
- Subject: ${conv[0].subject || "(no subject)"}
- Channel: ${conv[0].channel}
- Contact: ${conv[0].contactName || conv[0].contactIdentifier}

EXISTING MEETING MEMORY:
${JSON.stringify(currentMemory, null, 2)}

MANUAL ENTRIES (notes/decisions logged by team):
${JSON.stringify(entriesData, null, 2)}

NEW MESSAGES SINCE LAST SNAPSHOT (${relevantMsgs.length} messages):
${JSON.stringify(messageData, null, 2)}`;

              const snapshotRaw = await generate(prompt, COLLAB_SYSTEM_PROMPT, {
                temperature: 0.2,
                maxTokens: 1536,
                responseFormat: { type: "json_object" },
              });

              const snapshot = parseUntilJson(snapshotRaw);

              // Update memory from AI response
              if (snapshot.memoryUpdate) {
                currentMemory = snapshot.memoryUpdate;
              }

              // Update watermark
              if (relevantMsgs.length > 0) {
                lastProcessedId = Math.max(...relevantMsgs.map((m) => m.id));
              }

              // Persist to DB
              const snapshotCount = ((currentMemory as Record<string, unknown>).snapshotCount as number) || 0;
              await db
                .update(collaborationSessions)
                .set({
                  memory: { ...currentMemory, snapshotCount: snapshotCount + 1 },
                  latestSnapshot: snapshot,
                  lastProcessedMessageId: lastProcessedId,
                  updatedAt: new Date(),
                })
                .where(eq(collaborationSessions.id, Number(sessionId)));

              // Also log as an AI snapshot entry
              await db.insert(collaborationEntries).values({
                sessionId: Number(sessionId),
                userId: null,
                entryType: "ai_snapshot",
                content: JSON.stringify(snapshot),
                metadata: { messagesProcessed: relevantMsgs.length },
              });

              // Send snapshot event
              controller.enqueue(
                encoder.encode(
                  `event: snapshot\ndata: ${JSON.stringify({
                    snapshot,
                    metadata: {
                      messagesProcessed: relevantMsgs.length,
                      totalSnapshots: snapshotCount + 1,
                      generatedAt: new Date().toISOString(),
                    },
                  })}\n\n`
                )
              );
            } else {
              // No new data — send heartbeat
              controller.enqueue(
                encoder.encode(`event: heartbeat\ndata: ${JSON.stringify({ timestamp: new Date().toISOString() })}\n\n`)
              );
            }
          } catch (err) {
            console.error("SSE poll error:", err);
            controller.enqueue(
              encoder.encode(`event: error\ndata: ${JSON.stringify({ error: (err as Error).message })}\n\n`)
            );
          }

          // Wait before next poll
          await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
        }

        // Stream ended
        controller.enqueue(
          encoder.encode(`event: stream_end\ndata: ${JSON.stringify({ reason: "Max duration reached" })}\n\n`)
        );
        controller.close();
      };

      poll().catch((err) => {
        console.error("SSE stream error:", err);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
