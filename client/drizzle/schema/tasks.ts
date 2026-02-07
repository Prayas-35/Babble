import {
  pgTable,
  serial,
  timestamp,
  integer,
  text,
  varchar,
  index,
} from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { conversations } from './conversations';
import { users } from './user';
import { taskStatusEnum, taskPriorityEnum } from './enums';

export const tasks = pgTable(
  'tasks',
  {
    id: serial('id').primaryKey(),
    organizationId: integer('organization_id')
      .notNull()
      .references(() => organizations.id),
    conversationId: integer('conversation_id').references(
      () => conversations.id,
    ),
    title: varchar('title', { length: 500 }).notNull(),
    description: text('description'),
    status: taskStatusEnum('status').notNull().default('todo'),
    priority: taskPriorityEnum('priority').notNull().default('medium'),
    assignedTo: integer('assigned_to').references(() => users.id),
    dueDate: timestamp('due_date'),
    createdBy: integer('created_by')
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('tasks_org_idx').on(table.organizationId),
    index('tasks_status_idx').on(table.status),
    index('tasks_assigned_idx').on(table.assignedTo),
  ],
);
