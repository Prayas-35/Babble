import { pgTable, serial, timestamp, integer, text, varchar, jsonb, index } from "drizzle-orm/pg-core";
import { conversations } from "./conversations";
import { users } from "./user";
import { channelEnum, senderTypeEnum, messageDirectionEnum } from "./enums";

export const messages = pgTable('messages', {
  id: serial('id').primaryKey(),
  conversationId: integer('conversation_id').notNull().references(() => conversations.id),
  senderType: senderTypeEnum('sender_type').notNull(),
  senderId: integer('sender_id').references(() => users.id),
  channel: channelEnum('channel').notNull(),
  direction: messageDirectionEnum('direction').notNull(),
  body: text('body').notNull(),
  metadata: jsonb('metadata'),
  externalId: varchar('external_id', { length: 500 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
},
  (table) => [
    index('messages_conversation_idx').on(table.conversationId),
    index('messages_external_id_idx').on(table.externalId),
    index('messages_created_at_idx').on(table.createdAt),
  ]
);
