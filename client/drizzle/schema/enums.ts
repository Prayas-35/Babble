import { pgEnum } from "drizzle-orm/pg-core";

export const providerEnum = pgEnum('provider', ['google', 'outlook', 'slack']);

export const channelEnum = pgEnum('channel', [
  'email',
  'sms',
  'whatsapp',
  'slack',
  'web_chat',
  'internal_note',
]);

export const conversationStatusEnum = pgEnum('conversation_status', [
  'open',
  'closed',
  'snoozed',
  'archived',
]);

export const senderTypeEnum = pgEnum('sender_type', [
  'customer',
  'agent',
  'system',
  'bot',
]);

export const messageDirectionEnum = pgEnum('message_direction', [
  'inbound',
  'outbound',
]);

export const taskStatusEnum = pgEnum('task_status', [
  'todo',
  'in_progress',
  'done',
  'cancelled',
]);

export const taskPriorityEnum = pgEnum('task_priority', [
  'low',
  'medium',
  'high',
  'urgent',
]);

export const reminderStatusEnum = pgEnum('reminder_status', [
  'pending',
  'sent',
  'dismissed',
]);

export const summaryTypeEnum = pgEnum('summary_type', [
  'inbox_digest',
  'live_snapshot',
  'conversation_summary',
]);

export const teamRoleEnum = pgEnum('team_role', [
  'admin',
  'member',
  'viewer',
]);