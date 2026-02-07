import { pgTable, serial, timestamp, integer, varchar, index } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { users } from "./user";
import { channelEnum, conversationStatusEnum } from "./enums";

export const conversations = pgTable('conversations', {
  id: serial('id').primaryKey(),
  organizationId: integer('organization_id').notNull().references(() => organizations.id),
  channel: channelEnum('channel').notNull(),
  status: conversationStatusEnum('status').notNull().default('open'),
  subject: varchar('subject', { length: 500 }),
  contactName: varchar('contact_name', { length: 255 }),
  contactIdentifier: varchar('contact_identifier', { length: 500 }).notNull(),
  assignedTo: integer('assigned_to').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
},
  (table) => [
    index('conversations_org_idx').on(table.organizationId),
    index('conversations_status_idx').on(table.status),
    index('conversations_assigned_idx').on(table.assignedTo),
    index('conversations_channel_idx').on(table.channel),
  ]
);
