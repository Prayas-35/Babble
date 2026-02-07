"use server";

import { NextResponse } from "next/server";
import { withAuth, RequestWithUser } from "@/lib/middleware/auth.middleware";
import { db } from "@/drizzle/index";
import { messages } from "@/drizzle/schema/messages";
import { conversations } from "@/drizzle/schema/conversations";
import { eq, asc } from "drizzle-orm";
import { StatusCodes } from "http-status-codes";

/**
 * GET /api/inbox/messages
 *
 * List messages for a conversation.
 * Query params:
 *   - conversationId (required)
 */
async function getHandler(request: RequestWithUser) {
  const user = request.user;
  if (user instanceof NextResponse) return user;

  try {
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get("conversationId");

    if (!conversationId) {
      return NextResponse.json(
        { error: "conversationId is required" },
        { status: StatusCodes.BAD_REQUEST }
      );
    }

    const results = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, Number(conversationId)))
      .orderBy(asc(messages.createdAt));

    return NextResponse.json({ messages: results });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: StatusCodes.INTERNAL_SERVER_ERROR }
    );
  }
}

/**
 * POST /api/inbox/messages
 *
 * Add a message to a conversation (for agent replies or internal notes).
 * Body:
 *   - conversationId (required)
 *   - body (required)
 *   - channel (required)
 *   - direction (required): inbound | outbound
 *   - senderType (required): customer | agent | system | bot
 *   - senderId (optional): user ID if agent/system
 *   - metadata (optional): provider-specific data
 *   - externalId (optional): ID from external provider
 */
async function postHandler(request: RequestWithUser) {
  const user = request.user;
  if (user instanceof NextResponse) return user;

  try {
    const reqBody = await request.json();
    const {
      conversationId,
      body,
      channel,
      direction,
      senderType,
      senderId,
      metadata,
      externalId,
    } = reqBody;

    if (!conversationId || !body || !channel || !direction || !senderType) {
      return NextResponse.json(
        { error: "conversationId, body, channel, direction, and senderType are required" },
        { status: StatusCodes.BAD_REQUEST }
      );
    }

    const validChannels = ["email", "sms", "whatsapp", "slack", "web_chat", "internal_note"];
    if (!validChannels.includes(channel)) {
      return NextResponse.json(
        { error: `Invalid channel. Must be one of: ${validChannels.join(", ")}` },
        { status: StatusCodes.BAD_REQUEST }
      );
    }

    if (!["inbound", "outbound"].includes(direction)) {
      return NextResponse.json(
        { error: "direction must be inbound or outbound" },
        { status: StatusCodes.BAD_REQUEST }
      );
    }

    if (!["customer", "agent", "system", "bot"].includes(senderType)) {
      return NextResponse.json(
        { error: "senderType must be customer, agent, system, or bot" },
        { status: StatusCodes.BAD_REQUEST }
      );
    }

    // Insert the message
    const newMessage = await db
      .insert(messages)
      .values({
        conversationId: Number(conversationId),
        body,
        channel,
        direction,
        senderType,
        senderId: senderId ? Number(senderId) : null,
        metadata: metadata || null,
        externalId: externalId || null,
      })
      .returning();

    // Touch the conversation's updatedAt timestamp
    await db
      .update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, Number(conversationId)));

    return NextResponse.json(
      { message: newMessage[0] },
      { status: StatusCodes.CREATED }
    );
  } catch (error) {
    console.error("Error creating message:", error);
    return NextResponse.json(
      { error: "Failed to create message" },
      { status: StatusCodes.INTERNAL_SERVER_ERROR }
    );
  }
}

export const GET = withAuth(getHandler);
export const POST = withAuth(postHandler);
