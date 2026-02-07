import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL as string;

// Disable prefetch as it is not supported for "Transaction" pool mode
const client = postgres(connectionString, { prepare: false });
const db = drizzle(client);

export { db };

// Re-export all schemas for convenient access
export * from './schema/enums';
export * from './schema/user';
export * from './schema/provider_acounts';
export * from './schema/organizations';
export * from './schema/teams';
export * from './schema/conversations';
export * from './schema/messages';
export * from './schema/tasks';
export * from './schema/reminders';
export * from './schema/ai_summaries';
export * from './schema/collaboration_sessions';
