import { pgTable, serial, timestamp, integer, text, index } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { conversations } from "./conversations";
import { tasks } from "./tasks";
import { users } from "./user";
import { reminderStatusEnum } from "./enums";

export const reminders = pgTable('reminders', {
  id: serial('id').primaryKey(),
  organizationId: integer('organization_id').notNull().references(() => organizations.id),
  conversationId: integer('conversation_id').references(() => conversations.id),
  taskId: integer('task_id').references(() => tasks.id),
  userId: integer('user_id').notNull().references(() => users.id),
  remindAt: timestamp('remind_at').notNull(),
  message: text('message').notNull(),
  status: reminderStatusEnum('status').notNull().default('pending'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
},
  (table) => [
    index('reminders_user_idx').on(table.userId),
    index('reminders_status_idx').on(table.status),
    index('reminders_remind_at_idx').on(table.remindAt),
  ]
);
