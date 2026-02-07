// Shared types used across inbox components

export interface ConversationItem {
  id: number;
  channel: string;
  status: string;
  subject: string | null;
  contactName: string | null;
  contactIdentifier: string;
  assignedTo: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface MessageItem {
  id: number;
  conversationId: number;
  senderType: string;
  senderId: number | null;
  channel: string;
  direction: string;
  body: string;
  metadata: Record<string, unknown> | null;
  externalId: string | null;
  createdAt: string;
}

export interface InboxSummary {
  keyConversations: {
    conversationId: number;
    subject: string;
    contactName: string;
    channel: string;
    gist: string;
  }[];
  importantUpdates: string[];
  urgentItems: {
    conversationId: number;
    reason: string;
    requiredAction: string;
  }[];
  risksOrBlockers: string[];
  pendingDecisions: string[];
}

export interface SuggestedAction {
  type: string;
  title: string;
  description: string;
  conversationId: number | null;
  priority: string;
  requiredInputs: string[];
}

export interface LiveSnapshotData {
  currentGoal: string;
  decisionsMade: string[];
  openQuestions: string[];
  suggestedNextStep: string;
  unresolvedIssues: string[];
  participantSummary: {
    name: string;
    lastAction: string;
  }[];
}

export interface ConversationInsightsData {
  summary: string;
  sentiment: 'positive' | 'neutral' | 'negative' | 'mixed';
  keyPoints: string[];
  nextSteps: {
    action: string;
    owner: string;
    priority: string;
  }[];
  pendingQuestions: string[];
}

export const ACTION_TYPE_LABELS: Record<string, string> = {
  send_followup: "Send Follow-up",
  create_task: "Create Task",
  assign_task: "Assign Task",
  schedule_reminder: "Schedule Reminder",
  escalate: "Escalate",
  draft_reply: "Draft Reply",
  broadcast: "Broadcast",
};

export const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-slate-500/20 text-slate-400",
  medium: "bg-blue-500/20 text-blue-400",
  high: "bg-orange-500/20 text-orange-400",
  urgent: "bg-red-500/20 text-red-400",
};

export const CHANNEL_LABELS: Record<string, string> = {
  email: "Email",
  sms: "SMS",
  whatsapp: "WhatsApp",
  slack: "Slack",
  web_chat: "Web Chat",
  internal_note: "Note",
};
