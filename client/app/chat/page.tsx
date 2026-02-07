'use client';

import { Sidebar } from '@/components/sidebar';
import { ConversationList } from '@/components/conversation-list';
import { ConversationView } from '@/components/conversation-view';
import { SummaryPanel } from '@/components/summary-panel';
import { SuggestedActions } from '@/components/suggested-actions';
import { LiveSnapshot } from '@/components/live-snapshot';
import { CollaborationPanel } from '@/components/collaboration-panel';
import { useAuth } from '@/app/context/AuthContext';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import type {
  ConversationItem,
  MessageItem,
  InboxSummary,
  SuggestedAction,
  LiveSnapshotData,
  ConversationInsightsData,
} from '@/lib/types/inbox';

// Default org ID — in production this comes from the user's org context
const DEFAULT_ORG_ID = 1;

export default function DashboardPage() {
  const { tokens, user, loading, signOut } = useAuth();
  const router = useRouter();

  // ── ALL hooks must be declared before any early return ──────

  // ── Conversations state ─────────────────────────────────────
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [selectedConversation, setSelectedConversation] =
    useState<ConversationItem | null>(null);

  // ── Messages state ──────────────────────────────────────────
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);

  // ── Channel filter ──────────────────────────────────────────
  const [activeChannel, setActiveChannel] = useState<string | null>(null);

  // ── Email sync state ────────────────────────────────────────
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const hasSynced = useRef(false);

  // ── AI Summary panel ────────────────────────────────────────
  const [summary, setSummary] = useState<InboxSummary | null>(null);
  const [suggestedActions, setSuggestedActions] = useState<SuggestedAction[]>(
    [],
  );
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  // ── Live Snapshot ───────────────────────────────────────────
  const [snapshot, setSnapshot] = useState<LiveSnapshotData | null>(null);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [showSnapshot, setShowSnapshot] = useState(false);

  // ── Collaboration panel ─────────────────────────────────────
  const [showCollaboration, setShowCollaboration] = useState(false);

  // ── AI Suggest in conversation ──────────────────────────────
  const [aiSuggesting, setAiSuggesting] = useState(false);

  // ── Conversation Insights (per-conversation summary + next steps)
  const [insights, setInsights] = useState<ConversationInsightsData | null>(
    null,
  );
  const [insightsLoading, setInsightsLoading] = useState(false);

  const authHeaders = useCallback(() => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (tokens?.accessToken) {
      headers['Authorization'] = `Bearer ${tokens.accessToken}`;
    }
    return headers;
  }, [tokens]);

  // ── Ensure org exists (auto-seed) ───────────────────────────
  const ensureOrg = useCallback(async () => {
    try {
      await fetch('/api/user/ensure-org', {
        method: 'POST',
        headers: authHeaders(),
      });
    } catch {
      // Org creation failed — ingest may still work if org already exists
    }
  }, [authHeaders]);

  // ── Sync emails from provider ───────────────────────────────
  const syncEmails = useCallback(async () => {
    if (!tokens?.provider_token || !tokens?.provider) return;

    // Map auth provider name to ingest provider name
    const providerMap: Record<string, string> = {
      azure: 'outlook',
      google: 'google',
    };
    const ingestProvider = providerMap[tokens.provider];
    if (!ingestProvider) return;

    setSyncing(true);
    setSyncStatus('Syncing emails...');
    try {
      const res = await fetch('/api/inbox/ingest', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          organizationId: DEFAULT_ORG_ID,
          provider: ingestProvider,
          accessToken: tokens.provider_token,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const total =
          (data.conversationsCreated || 0) + (data.messagesCreated || 0);
        if (total > 0) {
          setSyncStatus(
            `Synced ${data.messagesCreated} message(s) across ${data.conversationsCreated} new conversation(s)`,
          );
        } else {
          setSyncStatus('Inbox is up to date');
        }
      } else {
        const err = await res.json().catch(() => ({}));
        setSyncStatus(`Sync failed: ${err.error || res.statusText}`);
      }
    } catch (err) {
      console.error('Failed to sync emails:', err);
      setSyncStatus('Sync failed — check console');
    } finally {
      setSyncing(false);
      // Clear status after a few seconds
      setTimeout(() => setSyncStatus(null), 5000);
    }
  }, [tokens, authHeaders]);

  // ── Fetch conversations (with optional channel filter) ──────
  const fetchConversations = useCallback(async () => {
    setConversationsLoading(true);
    try {
      let url = `/api/inbox/conversations?organizationId=${DEFAULT_ORG_ID}`;
      if (activeChannel) {
        url += `&channel=${activeChannel}`;
      }
      const res = await fetch(url, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    } finally {
      setConversationsLoading(false);
    }
  }, [authHeaders, activeChannel]);

  // ── Fetch messages for selected conversation ────────────────
  const fetchMessages = useCallback(
    async (conversationId: number) => {
      setMessagesLoading(true);
      try {
        const res = await fetch(
          `/api/inbox/messages?conversationId=${conversationId}`,
          { headers: authHeaders() },
        );
        if (res.ok) {
          const data = await res.json();
          setMessages(data.messages || []);
        }
      } catch (err) {
        console.error('Failed to fetch messages:', err);
      } finally {
        setMessagesLoading(false);
      }
    },
    [authHeaders],
  );

  // ── Send a message ──────────────────────────────────────────
  const sendMessage = useCallback(
    async (body: string) => {
      if (!selectedConversation) return;
      try {
        const res = await fetch('/api/inbox/messages', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({
            conversationId: selectedConversation.id,
            body,
            channel: selectedConversation.channel,
            direction: 'outbound',
            senderType: 'agent',
          }),
        });
        if (res.ok) {
          fetchMessages(selectedConversation.id);
        }
      } catch (err) {
        console.error('Failed to send message:', err);
      }
    },
    [selectedConversation, authHeaders, fetchMessages],
  );

  // ── AI: Analyze inbox (summary + actions) ───────────────────
  const analyzeInbox = useCallback(async () => {
    setSummaryLoading(true);
    setShowSummary(true);
    try {
      const res = await fetch('/api/inbox/analyze', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ organizationId: DEFAULT_ORG_ID }),
      });
      if (res.ok) {
        const data = await res.json();
        setSummary(data.summary || null);
        setSuggestedActions(data.suggestedActions || []);
      }
    } catch (err) {
      console.error('Failed to analyze inbox:', err);
    } finally {
      setSummaryLoading(false);
    }
  }, [authHeaders]);

  // ── AI: Suggest for current conversation ────────────────────
  const aiSuggestForConversation = useCallback(async () => {
    if (!selectedConversation) return;
    setAiSuggesting(true);
    setShowSummary(true);
    try {
      const res = await fetch('/api/inbox/analyze', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          organizationId: DEFAULT_ORG_ID,
          conversationIds: [selectedConversation.id],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setSummary(data.summary || null);
        setSuggestedActions(data.suggestedActions || []);
      }
    } catch (err) {
      console.error('Failed to get AI suggestions:', err);
    } finally {
      setAiSuggesting(false);
    }
  }, [selectedConversation, authHeaders]);

  // ── AI: Live snapshot ───────────────────────────────────────
  const generateSnapshot = useCallback(async () => {
    if (!selectedConversation) return;
    setSnapshotLoading(true);
    setShowSnapshot(true);
    try {
      const res = await fetch('/api/inbox/live-snapshot', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          conversationId: selectedConversation.id,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setSnapshot(data.snapshot || null);
      }
    } catch (err) {
      console.error('Failed to generate snapshot:', err);
    } finally {
      setSnapshotLoading(false);
    }
  }, [selectedConversation, authHeaders]);

  // ── AI: Per-conversation insights (summary + next steps) ────
  const fetchInsights = useCallback(
    async (conversationId?: number) => {
      const id = conversationId ?? selectedConversation?.id;
      if (!id) return;
      setInsightsLoading(true);
      try {
        const res = await fetch('/api/inbox/summarize', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ conversationId: id }),
        });
        if (res.ok) {
          const data = await res.json();
          setInsights(data.insights || null);
        }
      } catch (err) {
        console.error('Failed to fetch conversation insights:', err);
      } finally {
        setInsightsLoading(false);
      }
    },
    [selectedConversation, authHeaders],
  );

  // ── Handle action execution ─────────────────────────────────
  const handleExecuteAction = useCallback((action: SuggestedAction) => {
    console.log('Executing action:', action);
    alert(
      `Action: ${action.title}\nType: ${action.type}\nDescription: ${action.description}\n\n(Execution will be wired in the next phase)`,
    );
  }, []);

  // ── Select a conversation ───────────────────────────────────
  const handleSelectConversation = useCallback(
    (conv: ConversationItem) => {
      setSelectedConversation(conv);
      setShowSnapshot(false);
      setSnapshot(null);
      setInsights(null);
      fetchMessages(conv.id);
      // Auto-generate insights for the selected conversation
      fetchInsights(conv.id);
    },
    [fetchMessages, fetchInsights],
  );

  // ── Handle channel switch ───────────────────────────────────
  const handleChannelSelect = useCallback((channelId: string | null) => {
    setActiveChannel(channelId);
    setSelectedConversation(null);
    setMessages([]);
  }, []);

  // ── Handle sign out ─────────────────────────────────────────
  const handleSignOut = useCallback(async () => {
    await signOut();
    router.replace('/');
  }, [signOut, router]);

  // ── Auth guard — redirect unauthenticated users ─────────────
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/');
    }
  }, [user, loading, router]);

  // ── Initial load — sync emails then fetch conversations ─────
  useEffect(() => {
    if (user && tokens && !hasSynced.current) {
      hasSynced.current = true;
      // Ensure org, sync emails, then fetch conversations
      ensureOrg().then(() => syncEmails().then(() => fetchConversations()));
    }
  }, [user, tokens, ensureOrg, syncEmails, fetchConversations]);

  // ── Re-fetch when channel filter changes ────────────────────
  useEffect(() => {
    if (user && hasSynced.current) {
      fetchConversations();
    }
  }, [activeChannel, user, fetchConversations]);

  // ── Early returns AFTER all hooks ───────────────────────────
  if (loading) {
    return (
      <div className="h-screen bg-background flex items-center justify-center dark">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  if (!user) return null;

  // ── Render ──────────────────────────────────────────────────
  return (
    <div className="h-screen bg-background flex font-sans dark">
      {/* Left Sidebar - Channels */}
      <Sidebar
        onAnalyzeInbox={analyzeInbox}
        activeChannel={activeChannel}
        onChannelSelect={handleChannelSelect}
        syncing={syncing}
        syncStatus={syncStatus}
        onSyncEmails={syncEmails}
        userEmail={user.email || null}
        onSignOut={handleSignOut}
      />

      {/* Center-Left Panel - Conversation List */}
      <ConversationList
        conversations={conversations}
        selectedId={selectedConversation?.id ?? null}
        onSelect={handleSelectConversation}
        loading={conversationsLoading}
      />

      {/* Center Panel - Conversation Detail + Snapshot */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <ConversationView
          conversation={selectedConversation}
          messages={messages}
          loading={messagesLoading}
          onBack={() => setSelectedConversation(null)}
          onSendMessage={sendMessage}
          onAiSuggest={aiSuggestForConversation}
          onLiveSnapshot={generateSnapshot}
          onCollaborate={() => setShowCollaboration((prev) => !prev)}
          aiSuggesting={aiSuggesting}
          insights={insights}
          insightsLoading={insightsLoading}
          onGenerateInsights={() => fetchInsights()}
          onCloseInsights={() => setInsights(null)}
        />

        {/* Live Snapshot (collapsible below conversation) */}
        {showSnapshot && (
          <LiveSnapshot
            snapshot={snapshot}
            loading={snapshotLoading}
            onClose={() => {
              setShowSnapshot(false);
              setSnapshot(null);
            }}
            onRefresh={generateSnapshot}
          />
        )}

        {/* Suggested Actions (collapsible below conversation) */}
        {showSummary && suggestedActions.length > 0 && (
          <SuggestedActions
            actions={suggestedActions}
            loading={summaryLoading}
            onExecute={handleExecuteAction}
            onClose={() => setSuggestedActions([])}
          />
        )}
      </div>

      {/* Right Panel - AI Summary */}
      {showSummary && (
        <SummaryPanel
          summary={summary}
          loading={summaryLoading}
          onClose={() => {
            setShowSummary(false);
            setSummary(null);
            setSuggestedActions([]);
          }}
        />
      )}

      {/* Right Panel - Live Collaboration */}
      {showCollaboration && (
        <CollaborationPanel
          conversationId={selectedConversation?.id ?? null}
          authHeaders={authHeaders}
          onClose={() => setShowCollaboration(false)}
        />
      )}
    </div>
  );
}
