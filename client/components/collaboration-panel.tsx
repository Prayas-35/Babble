'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Radio,
  Target,
  CheckCircle2,
  HelpCircle,
  ArrowRight,
  AlertCircle,
  Users,
  Loader2,
  X,
  Plus,
  Lightbulb,
  ClipboardList,
  MessageSquare,
  CircleDot,
  StopCircle,
  Play,
  Activity,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { LiveSnapshotData } from '@/lib/types/inbox';

// ── Types ─────────────────────────────────────────────────────

export interface CollaborationSession {
  id: number;
  conversationId: number;
  createdBy: number | null;
  isActive: boolean;
  memory: MeetingMemory;
  latestSnapshot: LiveSnapshotData | null;
  lastProcessedMessageId: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface MeetingMemory {
  decisions: string[];
  openQuestions: string[];
  actionItems: string[];
  keyPoints: string[];
  snapshotCount: number;
}

export interface CollaborationEntry {
  id: number;
  sessionId: number;
  userId: number | null;
  entryType: string;
  content: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

type EntryType = 'decision' | 'note' | 'question' | 'action_item';

interface CollaborationPanelProps {
  conversationId: number | null;
  authHeaders: () => Record<string, string>;
  onClose: () => void;
}

const ENTRY_TYPE_CONFIG: Record<
  EntryType,
  { label: string; icon: typeof CheckCircle2; color: string; bgColor: string }
> = {
  decision: {
    label: 'Decision',
    icon: CheckCircle2,
    color: 'text-green-400',
    bgColor: 'bg-green-500/10 border-green-500/20',
  },
  note: {
    label: 'Note',
    icon: MessageSquare,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10 border-blue-500/20',
  },
  question: {
    label: 'Question',
    icon: HelpCircle,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10 border-yellow-500/20',
  },
  action_item: {
    label: 'Action Item',
    icon: ClipboardList,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10 border-orange-500/20',
  },
};

// ── Component ─────────────────────────────────────────────────

export function CollaborationPanel({
  conversationId,
  authHeaders,
  onClose,
}: CollaborationPanelProps) {
  // Session state
  const [session, setSession] = useState<CollaborationSession | null>(null);
  const [entries, setEntries] = useState<CollaborationEntry[]>([]);
  const [sessionLoading, setSessionLoading] = useState(false);

  // Streaming state
  const [isStreaming, setIsStreaming] = useState(false);
  const [latestSnapshot, setLatestSnapshot] = useState<LiveSnapshotData | null>(
    null,
  );
  const [snapshotMeta, setSnapshotMeta] = useState<{
    totalSnapshots: number;
    generatedAt: string;
  } | null>(null);

  // Entry input state
  const [newEntryType, setNewEntryType] = useState<EntryType>('note');
  const [newEntryContent, setNewEntryContent] = useState('');
  const [addingEntry, setAddingEntry] = useState(false);

  // SSE ref
  const eventSourceRef = useRef<EventSource | null>(null);
  const entriesEndRef = useRef<HTMLDivElement>(null);

  // ── Start a session ───────────────────────────────────────
  const startSession = useCallback(async () => {
    if (!conversationId) return;
    setSessionLoading(true);
    try {
      const res = await fetch('/api/inbox/collaborate', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ conversationId }),
      });
      if (res.ok) {
        const data = await res.json();
        const sess = data.session as CollaborationSession;
        setSession(sess);
        setLatestSnapshot(sess.latestSnapshot || null);
      }
    } catch (err) {
      console.error('Failed to start collaboration session:', err);
    } finally {
      setSessionLoading(false);
    }
  }, [conversationId, authHeaders]);

  // ── End session ───────────────────────────────────────────
  const endSession = useCallback(async () => {
    if (!session) return;
    try {
      await fetch(`/api/inbox/collaborate/${session.id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ isActive: false }),
      });
      // Close SSE stream
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setIsStreaming(false);
      setSession((prev) => (prev ? { ...prev, isActive: false } : null));
    } catch (err) {
      console.error('Failed to end session:', err);
    }
  }, [session, authHeaders]);

  // ── Fetch session entries ─────────────────────────────────
  const fetchEntries = useCallback(async () => {
    if (!session) return;
    try {
      const res = await fetch(`/api/inbox/collaborate/${session.id}`, {
        headers: authHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries || []);
      }
    } catch (err) {
      console.error('Failed to fetch entries:', err);
    }
  }, [session, authHeaders]);

  // ── Add an entry ──────────────────────────────────────────
  const addEntry = useCallback(async () => {
    if (!session || !newEntryContent.trim()) return;
    setAddingEntry(true);
    try {
      const res = await fetch(`/api/inbox/collaborate/${session.id}/entries`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          entryType: newEntryType,
          content: newEntryContent.trim(),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setEntries((prev) => [...prev, data.entry]);
        setNewEntryContent('');
        // Scroll to bottom
        setTimeout(() => {
          entriesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    } catch (err) {
      console.error('Failed to add entry:', err);
    } finally {
      setAddingEntry(false);
    }
  }, [session, newEntryType, newEntryContent, authHeaders]);

  // ── Connect SSE stream ────────────────────────────────────
  const connectStream = useCallback(() => {
    if (!session?.isActive) return;

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const headers = authHeaders();
    const token = headers['Authorization']?.replace('Bearer ', '') || '';

    // EventSource doesn't support custom headers natively,
    // so we pass the token as a query param (the stream route
    // also accepts the Authorization header from fetch-based SSE,
    // but for browser EventSource we use a workaround).
    // We'll use fetch-based SSE instead for auth support.

    const controller = new AbortController();

    const connectFetchSSE = async () => {
      try {
        const response = await fetch(
          `/api/inbox/collaborate/${session.id}/stream`,
          {
            headers: {
              ...headers,
              Accept: 'text/event-stream',
            },
            signal: controller.signal,
          },
        );

        if (!response.ok || !response.body) {
          console.error('SSE connection failed:', response.status);
          setIsStreaming(false);
          return;
        }

        setIsStreaming(true);

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          let currentEvent = '';
          for (const line of lines) {
            if (line.startsWith('event: ')) {
              currentEvent = line.slice(7).trim();
            } else if (line.startsWith('data: ')) {
              const dataStr = line.slice(6);
              try {
                const data = JSON.parse(dataStr);
                handleSSEEvent(currentEvent, data);
              } catch {
                // Non-JSON data, ignore
              }
            }
          }
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('SSE fetch error:', err);
        }
      } finally {
        setIsStreaming(false);
      }
    };

    connectFetchSSE();

    // Store abort controller as a closeable ref
    eventSourceRef.current = {
      close: () => controller.abort(),
    } as unknown as EventSource;
  }, [session, authHeaders]);

  // ── Handle SSE events ─────────────────────────────────────
  const handleSSEEvent = useCallback(
    (event: string, data: Record<string, unknown>) => {
      switch (event) {
        case 'connected':
          console.log('Collaboration stream connected', data);
          break;

        case 'snapshot':
          setLatestSnapshot(data.snapshot as LiveSnapshotData);
          setSnapshotMeta(
            data.metadata as { totalSnapshots: number; generatedAt: string },
          );
          // Refresh entries to include the ai_snapshot entry
          fetchEntries();
          break;

        case 'session_ended':
          setIsStreaming(false);
          setSession((prev) => (prev ? { ...prev, isActive: false } : null));
          break;

        case 'stream_end':
          setIsStreaming(false);
          break;

        case 'error':
          console.error('SSE error event:', data);
          break;

        case 'heartbeat':
          // Connection alive, no action needed
          break;
      }
    },
    [fetchEntries],
  );

  // ── Auto-start session when conversation selected ─────────
  useEffect(() => {
    if (conversationId) {
      // Check for existing active session first
      const checkExisting = async () => {
        setSessionLoading(true);
        try {
          const res = await fetch(
            `/api/inbox/collaborate?conversationId=${conversationId}`,
            { headers: authHeaders() },
          );
          if (res.ok) {
            const data = await res.json();
            if (data.sessions?.length > 0) {
              const sess = data.sessions[0] as CollaborationSession;
              setSession(sess);
              setLatestSnapshot(sess.latestSnapshot || null);
            } else {
              setSession(null);
              setLatestSnapshot(null);
              setEntries([]);
            }
          }
        } catch (err) {
          console.error('Failed to check existing session:', err);
        } finally {
          setSessionLoading(false);
        }
      };
      checkExisting();
    } else {
      setSession(null);
      setLatestSnapshot(null);
      setEntries([]);
    }

    // Cleanup stream on unmount / conversation change
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setIsStreaming(false);
    };
  }, [conversationId, authHeaders]);

  // ── Fetch entries when session loads ───────────────────────
  useEffect(() => {
    if (session) {
      fetchEntries();
    }
  }, [session, fetchEntries]);

  // ── Render helpers ────────────────────────────────────────

  function formatTime(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // ── No conversation selected ──────────────────────────────
  if (!conversationId) {
    return (
      <div className="w-80 border-l border-border bg-card flex flex-col">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-purple-400 flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5" />
            Live Collaboration
          </h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-6 w-6"
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-xs text-muted-foreground text-center">
            Select a conversation to start a collaboration session.
          </p>
        </div>
      </div>
    );
  }

  // ── Loading state ─────────────────────────────────────────
  if (sessionLoading) {
    return (
      <div className="w-80 border-l border-border bg-card flex flex-col">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-purple-400 flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5" />
            Live Collaboration
          </h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-6 w-6"
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
        </div>
      </div>
    );
  }

  // ── No active session — show start button ─────────────────
  if (!session || !session.isActive) {
    return (
      <div className="w-80 border-l border-border bg-card flex flex-col">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-purple-400 flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5" />
            Live Collaboration
          </h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-6 w-6"
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-4">
          <div className="w-12 h-12 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
            <Activity className="w-6 h-6 text-purple-400" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground mb-1">
              Start Live Assist
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Begin a collaboration session with AI-powered real-time snapshots,
              decision tracking, and meeting memory.
            </p>
          </div>
          <Button
            onClick={startSession}
            className="bg-purple-600 hover:bg-purple-700 text-white text-xs px-4"
          >
            <Play className="w-3.5 h-3.5 mr-1.5" />
            Start Session
          </Button>

          {/* Show summary from ended session if available */}
          {session && !session.isActive && (
            <div className="w-full mt-3 p-3 rounded-lg bg-muted/50 border border-border">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1.5">
                Last Session Summary
              </p>
              {session.memory?.decisions?.length > 0 && (
                <div className="mb-1.5">
                  <p className="text-[10px] text-green-400 font-medium">
                    {session.memory.decisions.length} decision(s)
                  </p>
                </div>
              )}
              {session.memory?.actionItems?.length > 0 && (
                <div className="mb-1.5">
                  <p className="text-[10px] text-orange-400 font-medium">
                    {session.memory.actionItems.length} action item(s)
                  </p>
                </div>
              )}
              <p className="text-[10px] text-muted-foreground">
                {session.memory?.snapshotCount || 0} AI snapshots generated
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Active session ────────────────────────────────────────
  return (
    <div className="w-80 border-l border-border bg-card flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border shrink-0">
        <div className="flex items-center gap-1.5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-purple-400 flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5" />
            Live Session
          </h3>
          {isStreaming && (
            <span className="flex items-center gap-1 text-[10px] text-green-400">
              <CircleDot className="w-2.5 h-2.5 animate-pulse" />
              Streaming
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {!isStreaming ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={connectStream}
              className="h-6 text-[10px] px-2 text-green-400 hover:text-green-300"
            >
              <Play className="w-3 h-3 mr-1" />
              Stream
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                eventSourceRef.current?.close();
                eventSourceRef.current = null;
                setIsStreaming(false);
              }}
              className="h-6 text-[10px] px-2 text-red-400 hover:text-red-300"
            >
              <StopCircle className="w-3 h-3 mr-1" />
              Pause
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={endSession}
            className="h-6 text-[10px] px-2 text-muted-foreground hover:text-red-400"
          >
            End
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-6 w-6"
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* ── AI Snapshot Section ─────────────────────────── */}
        {latestSnapshot && (
          <div className="space-y-2 p-2.5 rounded-lg bg-purple-500/5 border border-purple-500/15">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold text-purple-400 uppercase tracking-wide flex items-center gap-1">
                <Lightbulb className="w-3 h-3" />
                AI Snapshot
              </p>
              {snapshotMeta && (
                <p className="text-[9px] text-muted-foreground">
                  #{snapshotMeta.totalSnapshots}
                </p>
              )}
            </div>

            {/* Goal */}
            <div className="flex items-start gap-1.5">
              <Target className="w-3 h-3 text-purple-400 mt-0.5 shrink-0" />
              <p className="text-[11px] text-foreground leading-snug">
                {latestSnapshot.currentGoal}
              </p>
            </div>

            {/* Decisions */}
            {latestSnapshot.decisionsMade?.length > 0 && (
              <div className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3 h-3 text-green-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[9px] font-semibold text-green-400 uppercase">
                    Decisions
                  </p>
                  {latestSnapshot.decisionsMade.map((d, i) => (
                    <p key={i} className="text-[11px] text-muted-foreground">
                      • {d}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Open Questions */}
            {latestSnapshot.openQuestions?.length > 0 && (
              <div className="flex items-start gap-1.5">
                <HelpCircle className="w-3 h-3 text-yellow-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[9px] font-semibold text-yellow-400 uppercase">
                    Open Questions
                  </p>
                  {latestSnapshot.openQuestions.map((q, i) => (
                    <p key={i} className="text-[11px] text-muted-foreground">
                      • {q}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Unresolved */}
            {latestSnapshot.unresolvedIssues?.length > 0 && (
              <div className="flex items-start gap-1.5">
                <AlertCircle className="w-3 h-3 text-orange-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[9px] font-semibold text-orange-400 uppercase">
                    Unresolved
                  </p>
                  {latestSnapshot.unresolvedIssues.map((u, i) => (
                    <p key={i} className="text-[11px] text-muted-foreground">
                      • {u}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Participants */}
            {latestSnapshot.participantSummary?.length > 0 && (
              <div className="flex items-start gap-1.5">
                <Users className="w-3 h-3 text-blue-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[9px] font-semibold text-blue-400 uppercase">
                    Participants
                  </p>
                  {latestSnapshot.participantSummary.map((p, i) => (
                    <p key={i} className="text-[11px] text-muted-foreground">
                      <span className="text-foreground font-medium">
                        {p.name}
                      </span>
                      : {p.lastAction}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Next Step */}
            <div className="flex items-start gap-1.5 p-1.5 rounded bg-purple-500/10">
              <ArrowRight className="w-3 h-3 text-purple-400 mt-0.5 shrink-0" />
              <p className="text-[11px] text-foreground leading-snug">
                {latestSnapshot.suggestedNextStep}
              </p>
            </div>
          </div>
        )}

        {/* ── Meeting Memory ─────────────────────────────── */}
        {session.memory && (
          <div className="space-y-2 p-2.5 rounded-lg bg-muted/30 border border-border">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
              Meeting Memory
            </p>

            {session.memory.decisions?.length > 0 && (
              <div>
                <p className="text-[9px] font-semibold text-green-400 uppercase mb-0.5">
                  Decisions ({session.memory.decisions.length})
                </p>
                {session.memory.decisions.map((d, i) => (
                  <p key={i} className="text-[11px] text-muted-foreground">
                    ✓ {d}
                  </p>
                ))}
              </div>
            )}

            {session.memory.actionItems?.length > 0 && (
              <div>
                <p className="text-[9px] font-semibold text-orange-400 uppercase mb-0.5">
                  Action Items ({session.memory.actionItems.length})
                </p>
                {session.memory.actionItems.map((a, i) => (
                  <p key={i} className="text-[11px] text-muted-foreground">
                    → {a}
                  </p>
                ))}
              </div>
            )}

            {session.memory.openQuestions?.length > 0 && (
              <div>
                <p className="text-[9px] font-semibold text-yellow-400 uppercase mb-0.5">
                  Open Questions ({session.memory.openQuestions.length})
                </p>
                {session.memory.openQuestions.map((q, i) => (
                  <p key={i} className="text-[11px] text-muted-foreground">
                    ? {q}
                  </p>
                ))}
              </div>
            )}

            {session.memory.keyPoints?.length > 0 && (
              <div>
                <p className="text-[9px] font-semibold text-blue-400 uppercase mb-0.5">
                  Key Points ({session.memory.keyPoints.length})
                </p>
                {session.memory.keyPoints.map((k, i) => (
                  <p key={i} className="text-[11px] text-muted-foreground">
                    • {k}
                  </p>
                ))}
              </div>
            )}

            <p className="text-[9px] text-muted-foreground pt-1 border-t border-border">
              {session.memory.snapshotCount || 0} snapshots generated
            </p>
          </div>
        )}

        {/* ── Entry Timeline ─────────────────────────────── */}
        {entries.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
              Timeline
            </p>
            {entries
              .filter((e) => e.entryType !== 'ai_snapshot')
              .map((entry) => {
                const config =
                  ENTRY_TYPE_CONFIG[entry.entryType as EntryType] ||
                  ENTRY_TYPE_CONFIG.note;
                const Icon = config.icon;
                return (
                  <div
                    key={entry.id}
                    className={cn(
                      'flex items-start gap-2 p-2 rounded-md border',
                      config.bgColor,
                    )}
                  >
                    <Icon
                      className={cn('w-3 h-3 mt-0.5 shrink-0', config.color)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p
                          className={cn(
                            'text-[9px] font-semibold uppercase',
                            config.color,
                          )}
                        >
                          {config.label}
                        </p>
                        <p className="text-[9px] text-muted-foreground">
                          {formatTime(entry.createdAt)}
                        </p>
                      </div>
                      <p className="text-[11px] text-foreground mt-0.5 wrap-break-word">
                        {entry.content}
                      </p>
                    </div>
                  </div>
                );
              })}
            <div ref={entriesEndRef} />
          </div>
        )}

        {/* Empty state when no snapshot and no entries */}
        {!latestSnapshot && entries.length === 0 && (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Activity className="w-8 h-8 text-muted-foreground/30 mb-2" />
            <p className="text-xs text-muted-foreground">
              Session is active. Start the stream or add entries below.
            </p>
          </div>
        )}
      </div>

      {/* ── Entry Input ──────────────────────────────────── */}
      <div className="shrink-0 border-t border-border p-3 space-y-2">
        {/* Type selector */}
        <div className="flex gap-1">
          {(Object.keys(ENTRY_TYPE_CONFIG) as EntryType[]).map((type) => {
            const config = ENTRY_TYPE_CONFIG[type];
            const Icon = config.icon;
            return (
              <button
                key={type}
                onClick={() => setNewEntryType(type)}
                className={cn(
                  'flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-colors border',
                  newEntryType === type
                    ? config.bgColor + ' ' + config.color
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50',
                )}
              >
                <Icon className="w-3 h-3" />
                {config.label}
              </button>
            );
          })}
        </div>

        {/* Input + submit */}
        <div className="flex gap-1.5">
          <input
            type="text"
            value={newEntryContent}
            onChange={(e) => setNewEntryContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                addEntry();
              }
            }}
            placeholder={`Add a ${ENTRY_TYPE_CONFIG[newEntryType].label.toLowerCase()}...`}
            className="flex-1 min-w-0 bg-muted/50 border border-border rounded-md px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-purple-500/50"
            disabled={addingEntry}
          />
          <Button
            size="icon"
            onClick={addEntry}
            disabled={addingEntry || !newEntryContent.trim()}
            className="h-7.5 w-7.5 bg-purple-600 hover:bg-purple-700 text-white shrink-0"
          >
            {addingEntry ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
