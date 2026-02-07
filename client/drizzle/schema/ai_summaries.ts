import {
  pgTable,
  serial,
  timestamp,
  integer,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { conversations } from './conversations';
import { summaryTypeEnum } from './enums';

export const aiSummaries = pgTable(
  'ai_summaries',
  {
    id: serial('id').primaryKey(),
    conversationId: integer('conversation_id')
      .notNull()
      .references(() => conversations.id),
    summaryType: summaryTypeEnum('summary_type').notNull(),
    content: jsonb('content').notNull(),
    generatedAt: timestamp('generated_at').notNull().defaultNow(),
  },
  (table) => [
    index('ai_summaries_conversation_idx').on(table.conversationId),
    index('ai_summaries_type_idx').on(table.summaryType),
  ],
);
