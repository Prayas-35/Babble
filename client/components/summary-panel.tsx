'use client';

import {
  AlertTriangle,
  TrendingUp,
  MessageSquare,
  ShieldAlert,
  HelpCircle,
  Loader2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { InboxSummary, CHANNEL_LABELS } from '@/lib/types/inbox';

interface SummaryPanelProps {
  summary: InboxSummary | null;
  loading: boolean;
  onClose: () => void;
}

const CHANNEL_ICON: Record<string, string> = {
  email: '✉️',
  sms: '💬',
  whatsapp: '📱',
  slack: '💼',
  web_chat: '🌐',
  internal_note: '📝',
};

export function SummaryPanel({ summary, loading, onClose }: SummaryPanelProps) {
  if (loading) {
    return (
      <div className="w-96 bg-card border-l border-border flex flex-col">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold text-foreground text-sm">
            Inbox Summary
          </h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-7 w-7"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            <p className="text-xs">Analyzing inbox...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="w-96 bg-card border-l border-border flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h3 className="font-semibold text-foreground text-sm">Inbox Summary</h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-7 w-7"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Urgent Items */}
        {summary.urgentItems.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <h4 className="text-xs font-semibold text-red-400 uppercase tracking-wide">
                Urgent
              </h4>
            </div>
            <div className="space-y-2">
              {summary.urgentItems.map((item, i) => (
                <div
                  key={i}
                  className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20"
                >
                  <p className="text-xs font-medium text-foreground mb-1">
                    {item.reason}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    → {item.requiredAction}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Key Conversations */}
        {summary.keyConversations.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="w-4 h-4 text-blue-400" />
              <h4 className="text-xs font-semibold text-blue-400 uppercase tracking-wide">
                Key Conversations
              </h4>
            </div>
            <div className="space-y-2">
              {summary.keyConversations.map((conv, i) => (
                <div
                  key={i}
                  className="p-2.5 rounded-lg bg-secondary/50 border border-border"
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-xs">
                      {CHANNEL_ICON[conv.channel] || '📩'}
                    </span>
                    <span className="text-xs font-medium text-foreground">
                      {conv.contactName}
                    </span>
                  </div>
                  <p className="text-xs text-foreground font-medium mb-0.5">
                    {conv.subject}
                  </p>
                  <p className="text-xs text-muted-foreground">{conv.gist}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Important Updates */}
        {summary.importantUpdates.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-green-400" />
              <h4 className="text-xs font-semibold text-green-400 uppercase tracking-wide">
                Important Updates
              </h4>
            </div>
            <ul className="space-y-1.5">
              {summary.importantUpdates.map((update, i) => (
                <li
                  key={i}
                  className="text-xs text-muted-foreground pl-3 border-l-2 border-green-500/30"
                >
                  {update}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Risks & Blockers */}
        {summary.risksOrBlockers.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-2">
              <ShieldAlert className="w-4 h-4 text-orange-400" />
              <h4 className="text-xs font-semibold text-orange-400 uppercase tracking-wide">
                Risks & Blockers
              </h4>
            </div>
            <ul className="space-y-1.5">
              {summary.risksOrBlockers.map((risk, i) => (
                <li
                  key={i}
                  className="text-xs text-muted-foreground pl-3 border-l-2 border-orange-500/30"
                >
                  {risk}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Pending Decisions */}
        {summary.pendingDecisions.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-2">
              <HelpCircle className="w-4 h-4 text-yellow-400" />
              <h4 className="text-xs font-semibold text-yellow-400 uppercase tracking-wide">
                Pending Decisions
              </h4>
            </div>
            <ul className="space-y-1.5">
              {summary.pendingDecisions.map((decision, i) => (
                <li
                  key={i}
                  className="text-xs text-muted-foreground pl-3 border-l-2 border-yellow-500/30"
                >
                  {decision}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
