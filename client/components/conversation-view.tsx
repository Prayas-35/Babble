'use client';

import {
  ArrowLeft,
  MoreVertical,
  Paperclip,
  Send,
  Zap,
  Loader2,
  Brain,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useState, useMemo } from 'react';
import type {
  ConversationItem,
  MessageItem,
  ConversationInsightsData,
} from '@/lib/types/inbox';
import { ConversationInsights } from '@/components/conversation-insights';

interface ConversationViewProps {
  conversation: ConversationItem | null;
  messages: MessageItem[];
  loading?: boolean;
  onBack?: () => void;
  onSendMessage?: (body: string) => void;
  onAiSuggest?: () => void;
  onLiveSnapshot?: () => void;
  onCollaborate?: () => void;
  aiSuggesting?: boolean;
  insights?: ConversationInsightsData | null;
  insightsLoading?: boolean;
  onGenerateInsights?: () => void;
  onCloseInsights?: () => void;
}

const CHANNEL_LABELS: Record<string, string> = {
  email: 'Email',
  sms: 'SMS',
  whatsapp: 'WhatsApp',
  slack: 'Slack',
  web_chat: 'Web Chat',
  internal_note: 'Note',
};

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Strip HTML to plain text for display.
 * Handles already-ingested messages that may still contain raw HTML.
 */
function stripHtml(text: string): string {
  // Quick check — if there are no tags, return as-is
  if (!/<[a-z][\s\S]*>/i.test(text)) return text;

  let t = text;
  // Remove style/script blocks first
  t = t.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  t = t.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  // Convert line-break and block-closing tags to newlines
  t = t.replace(/<br\s*\/?>/gi, '\n');
  t = t.replace(/<\/(p|div|tr|li|h[1-6]|blockquote)>/gi, '\n');
  t = t.replace(/<hr\s*\/?>/gi, '\n---\n');
  // Strip remaining tags
  t = t.replace(/<[^>]+>/g, '');
  // Decode HTML entities
  t = t
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"');
  // Decode all numeric entities: &#8202; &#39; &#x27; etc.
  t = t.replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16)),
  );
  t = t.replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)));
  // Collapse multiple newlines to one, remove blank lines
  t = t.replace(/\n{2,}/g, '\n');
  t = t
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .join('\n')
    .trim();
  return t;
}

export function ConversationView({
  conversation,
  messages,
  loading = false,
  onBack,
  onSendMessage,
  onAiSuggest,
  onLiveSnapshot,
  onCollaborate,
  aiSuggesting = false,
  insights = null,
  insightsLoading = false,
  onGenerateInsights,
  onCloseInsights,
}: ConversationViewProps) {
  const [replyText, setReplyText] = useState('');

  const handleSend = () => {
    if (!replyText.trim() || !onSendMessage) return;
    onSendMessage(replyText.trim());
    setReplyText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Empty state
  if (!conversation) {
    return (
      <div className="flex-1 min-h-0 bg-card flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground text-sm">
            Select a conversation to view
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 bg-card flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground"
            onClick={onBack}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="font-semibold text-foreground">
              {conversation.contactName || conversation.contactIdentifier}
            </h2>
            <p className="text-xs text-muted-foreground">
              {CHANNEL_LABELS[conversation.channel] || conversation.channel} •{' '}
              {conversation.contactIdentifier}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-8 gap-1.5 border-border bg-transparent"
            onClick={onLiveSnapshot}
            disabled={aiSuggesting}
          >
            <Brain className="w-3.5 h-3.5" />
            Snapshot
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-8 gap-1.5 border-purple-500/30 bg-purple-500/5 text-purple-400 hover:bg-purple-500/10"
            onClick={onCollaborate}
          >
            <Zap className="w-3.5 h-3.5" />
            Collaborate
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground"
          >
            <MoreVertical className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Subject bar */}
      {conversation.subject && (
        <div className="px-6 py-2 border-b border-border bg-secondary/30">
          <p className="text-sm font-medium text-foreground">
            {conversation.subject}
          </p>
        </div>
      )}

      {/* AI Insights — Summary & Next Steps */}
      {onGenerateInsights && onCloseInsights && (
        <ConversationInsights
          insights={insights}
          loading={insightsLoading}
          onGenerate={onGenerateInsights}
          onClose={onCloseInsights}
        />
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-4">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No messages in this conversation yet
          </div>
        )}

        {messages.map((message) => {
          const isOwn = message.direction === 'outbound';
          const initials = isOwn
            ? 'Y'
            : (conversation.contactName || conversation.contactIdentifier)
                .split(' ')
                .map((w) => w[0])
                .join('')
                .toUpperCase()
                .slice(0, 2);

          return (
            <div
              key={message.id}
              className={cn('flex gap-3', isOwn && 'flex-row-reverse')}
            >
              {/* Avatar */}
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold',
                  isOwn
                    ? 'bg-primary/20 text-primary'
                    : 'bg-secondary/60 text-foreground',
                )}
              >
                {initials}
              </div>

              {/* Message Content */}
              <div className={cn('flex flex-col gap-1', isOwn && 'items-end')}>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-foreground">
                    {isOwn
                      ? 'You'
                      : conversation.contactName ||
                        conversation.contactIdentifier}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatTime(message.createdAt)}
                  </span>
                  {message.senderType === 'bot' && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400">
                      AI
                    </span>
                  )}
                </div>
                <div
                  className={cn(
                    'rounded-lg px-4 py-2 max-w-md text-sm whitespace-pre-wrap break-words overflow-hidden',
                    isOwn
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-foreground',
                  )}
                >
                  {stripHtml(message.body)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Reply Composer */}
      <div className="px-6 py-4 border-t border-border">
        <div className="flex gap-2 mb-3">
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-8 gap-2 border-border bg-transparent"
            onClick={onAiSuggest}
            disabled={aiSuggesting}
          >
            {aiSuggesting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Zap className="w-3.5 h-3.5" />
            )}
            {aiSuggesting ? 'Analyzing...' : 'AI Suggest'}
          </Button>
        </div>
        <div className="flex gap-3 items-end">
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground h-10 w-10"
          >
            <Paperclip className="w-5 h-5" />
          </Button>
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Write your reply..."
            rows={3}
            className="flex-1 bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <Button
            className="h-10 w-10 bg-primary hover:bg-primary/90"
            size="icon"
            onClick={handleSend}
            disabled={!replyText.trim()}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
