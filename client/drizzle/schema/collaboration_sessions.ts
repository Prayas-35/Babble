import { pgTable, serial, timestamp, integer, text, jsonb, boolean, index } from "drizzle-orm/pg-core";
import { conversations } from "./conversations";
import { users } from "./user";

/**
 * Collaboration sessions track live "meeting memory" for a conversation.
 * A session is created when a user starts collaborating and accumulates
 * notes, decisions, and AI snapshots over its lifetime.
 */
export const collaborationSessions = pgTable('collaboration_sessions', {
  id: serial('id').primaryKey(),
  conversationId: integer('conversation_id').notNull().references(() => conversations.id),
  createdBy: integer('created_by').notNull().references(() => users.id),
  isActive: boolean('is_active').notNull().default(true),
  /** Running meeting memory — accumulates across snapshots */
  memory: jsonb('memory').notNull().default('{}'),
  /** Latest AI snapshot (cached for quick reads) */
  latestSnapshot: jsonb('latest_snapshot'),
  /** Message ID watermark — tracks last message processed */
  lastProcessedMessageId: integer('last_processed_message_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
},
  (table) => [
    index('collab_sessions_conv_idx').on(table.conversationId),
    index('collab_sessions_active_idx').on(table.isActive),
  ]
);

/**
 * Session entries are individual items logged during a collaboration session:
 * decisions, notes, open questions, or action items added by participants or AI.
 */
export const collaborationEntries = pgTable('collaboration_entries', {
  id: serial('id').primaryKey(),
  sessionId: integer('session_id').notNull().references(() => collaborationSessions.id),
  userId: integer('user_id').references(() => users.id),
  /** "decision" | "note" | "question" | "action_item" | "ai_snapshot" */
  entryType: text('entry_type').notNull(),
  content: text('content').notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
},
  (table) => [
    index('collab_entries_session_idx').on(table.sessionId),
    index('collab_entries_type_idx').on(table.entryType),
  ]
);
