import { pgTable, serial, text, varchar, timestamp, integer } from "drizzle-orm/pg-core";
import { users } from "./user";
import { providerEnum } from "./enums";

export const providerAccounts = pgTable('provider_accounts', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull().references(() => users.id),
    provider: providerEnum('provider'),
    providerAccountId: varchar('provider_account_id', { length: 255 }).notNull(),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    createdAt: timestamp('created_at').notNull(),
    expiresAt: timestamp('expires_at'),
});