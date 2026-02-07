'use client';

import { Search, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { useState, useMemo } from 'react';
import type { ConversationItem } from '@/lib/types/inbox';

interface ConversationListProps {
  conversations: ConversationItem[];
  selectedId: number | null;
  onSelect: (conversation: ConversationItem) => void;
  loading?: boolean;
}

function getInitials(name: string | null, identifier: string): string {
  if (name) {
    return name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
  return identifier.slice(0, 2).toUpperCase();
}

function formatTimestamp(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay === 1) return 'Yesterday';
  return date.toLocaleDateString();
}

const CHANNEL_LABELS_MAP: Record<string, string> = {
  email: 'Email',
  sms: 'SMS',
  whatsapp: 'WhatsApp',
  slack: 'Slack',
  web_chat: 'Web Chat',
  internal_note: 'Note',
};

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  loading = false,
}: ConversationListProps) {
  const [search, setSearch] = useState('');
  const [filterUnread] = useState(false);

  const filtered = useMemo(() => {
    let result = conversations;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.subject?.toLowerCase().includes(q) ||
          c.contactName?.toLowerCase().includes(q) ||
          c.contactIdentifier.toLowerCase().includes(q),
      );
    }
    if (filterUnread) {
      result = result.filter((c) => c.status === 'open');
    }
    return result;
  }, [conversations, search, filterUnread]);

  return (
    <div className="w-96 bg-card border-r border-border flex flex-col">
      {/* Search & Filter */}
      <div className="p-4 border-b border-border space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search conversations..."
            className="pl-9 bg-input border-border"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-input hover:bg-input/80 transition-colors text-xs text-muted-foreground">
            <Filter className="w-3 h-3" />
            <span>Unread</span>
          </button>
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="p-6 text-center text-sm text-muted-foreground">
            Loading conversations...
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="p-6 text-center text-sm text-muted-foreground">
            {search ? 'No matching conversations' : 'No conversations yet'}
          </div>
        )}

        {filtered.map((conversation) => (
          <button
            key={conversation.id}
            onClick={() => onSelect(conversation)}
            className={cn(
              'w-full px-4 py-3 border-b border-border hover:bg-secondary transition-colors text-left',
              selectedId === conversation.id && 'bg-secondary/60',
            )}
          >
            <div className="flex items-start gap-3">
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs font-semibold text-primary">
                  {getInitials(
                    conversation.contactName,
                    conversation.contactIdentifier,
                  )}
                </span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <p
                    className={cn(
                      'text-sm truncate',
                      conversation.status === 'open'
                        ? 'font-semibold text-foreground'
                        : 'font-medium text-foreground',
                    )}
                  >
                    {conversation.contactName || conversation.contactIdentifier}
                  </p>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatTimestamp(conversation.updatedAt)}
                  </span>
                </div>
                <p className="text-xs font-medium text-muted-foreground mb-1 truncate">
                  {conversation.subject || '(no subject)'}
                </p>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                    {CHANNEL_LABELS_MAP[conversation.channel] ||
                      conversation.channel}
                  </span>
                  <span
                    className={cn(
                      'text-[10px] px-1.5 py-0.5 rounded',
                      conversation.status === 'open'
                        ? 'bg-green-500/20 text-green-400'
                        : conversation.status === 'snoozed'
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-secondary text-muted-foreground',
                    )}
                  >
                    {conversation.status}
                  </span>
                </div>
              </div>

              {/* Unread indicator */}
              {conversation.status === 'open' && (
                <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1" />
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
