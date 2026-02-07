'use client';

import React from 'react';

import {
  Mail,
  MessageSquare,
  Slack,
  Settings,
  User,
  LogOut,
  Sparkles,
  RefreshCw,
  Inbox,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface Channel {
  id: string;
  name: string;
  icon: React.ReactNode;
}

interface SidebarProps {
  onAnalyzeInbox?: () => void;
  activeChannel: string | null;
  onChannelSelect: (channelId: string | null) => void;
  syncing?: boolean;
  syncStatus?: string | null;
  onSyncEmails?: () => void;
  userEmail?: string | null;
  onSignOut?: () => void;
}

const CHANNELS: Channel[] = [
  { id: 'email', name: 'Email', icon: <Mail className="w-5 h-5" /> },
  { id: 'slack', name: 'Slack', icon: <Slack className="w-5 h-5" /> },
  {
    id: 'web_chat',
    name: 'Web Chat',
    icon: <MessageSquare className="w-5 h-5" />,
  },
];

export function Sidebar({
  onAnalyzeInbox,
  activeChannel,
  onChannelSelect,
  syncing = false,
  syncStatus,
  onSyncEmails,
  userEmail,
  onSignOut,
}: SidebarProps) {
  const initial = userEmail ? userEmail[0].toUpperCase() : 'U';

  return (
    <div className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">B</span>
          </div>
          <h1 className="text-lg font-bold text-sidebar-foreground">Babble</h1>
        </div>
        <p className="text-xs text-muted-foreground">Unified inbox</p>
      </div>

      {/* Action buttons */}
      <div className="p-4 border-b border-sidebar-border space-y-2">
        {onAnalyzeInbox && (
          <button
            onClick={onAnalyzeInbox}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary/10 hover:bg-primary/20 border border-primary/30 transition-colors text-sm font-medium text-primary"
          >
            <Sparkles className="w-4 h-4" />
            <span>Analyze Inbox</span>
          </button>
        )}

        {onSyncEmails && (
          <button
            onClick={onSyncEmails}
            disabled={syncing}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-sidebar-accent/10 hover:bg-sidebar-accent/20 border border-sidebar-border transition-colors text-sm font-medium text-sidebar-foreground disabled:opacity-50"
          >
            {syncing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            <span>{syncing ? 'Syncing...' : 'Sync Emails'}</span>
          </button>
        )}

        {syncStatus && (
          <p className="text-[11px] text-center text-muted-foreground animate-in fade-in duration-300">
            {syncStatus}
          </p>
        )}
      </div>

      {/* Channels */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-1.5">
        <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-2 px-2">
          Channels
        </p>

        {/* All channel button */}
        <button
          onClick={() => onChannelSelect(null)}
          className={cn(
            'w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left',
            activeChannel === null
              ? 'bg-sidebar-primary/15 text-sidebar-primary border border-sidebar-primary/30'
              : 'text-sidebar-foreground hover:bg-sidebar-accent/5',
          )}
        >
          <div
            className={cn(
              'text-lg',
              activeChannel === null
                ? 'text-sidebar-primary'
                : 'text-muted-foreground',
            )}
          >
            <Inbox className="w-5 h-5" />
          </div>
          <span className="text-sm font-medium">All Channels</span>
        </button>

        {CHANNELS.map((channel) => {
          const isActive = activeChannel === channel.id;
          return (
            <button
              key={channel.id}
              onClick={() => onChannelSelect(channel.id)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left',
                isActive
                  ? 'bg-sidebar-primary/15 text-sidebar-primary border border-sidebar-primary/30'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/5',
              )}
            >
              <div
                className={cn(
                  'text-lg',
                  isActive ? 'text-sidebar-primary' : 'text-muted-foreground',
                )}
              >
                {channel.icon}
              </div>
              <span className="text-sm font-medium">{channel.name}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border space-y-2">
        <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent/10 transition-colors text-sm">
          <Settings className="w-4 h-4" />
          <span>Settings</span>
        </button>

        <div className="flex items-center gap-3 px-4 py-3 rounded-lg">
          <div className="w-8 h-8 rounded-full bg-primary/30 flex items-center justify-center shrink-0">
            <span className="text-xs font-semibold text-primary">
              {initial}
            </span>
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-xs font-medium text-sidebar-foreground truncate">
              {userEmail || 'Signed in'}
            </p>
          </div>
          {onSignOut && (
            <button
              onClick={onSignOut}
              title="Sign out"
              className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
