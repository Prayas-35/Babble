'use client';

import {
  Target,
  CheckCircle2,
  HelpCircle,
  ArrowRight,
  AlertCircle,
  Users,
  Loader2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { LiveSnapshotData } from '@/lib/types/inbox';

interface LiveSnapshotProps {
  snapshot: LiveSnapshotData | null;
  loading: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export function LiveSnapshot({
  snapshot,
  loading,
  onClose,
  onRefresh,
}: LiveSnapshotProps) {
  if (loading) {
    return (
      <div className="border-t border-border p-4 bg-purple-500/5">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-semibold text-purple-400 uppercase tracking-wide">
            Live Snapshot
          </h4>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6">
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
        <div className="flex items-center justify-center py-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <p className="text-xs">Generating snapshot...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!snapshot) return null;

  return (
    <div className="border-t border-border p-4 bg-purple-500/5">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold text-purple-400 uppercase tracking-wide">
          Live Snapshot
        </h4>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            className="h-6 text-[10px] px-2 text-muted-foreground hover:text-foreground"
          >
            Refresh
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6">
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {/* Current Goal */}
        <div className="flex items-start gap-2">
          <Target className="w-3.5 h-3.5 text-purple-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-[10px] font-semibold text-purple-400 uppercase mb-0.5">
              Goal
            </p>
            <p className="text-xs text-foreground">{snapshot.currentGoal}</p>
          </div>
        </div>

        {/* Decisions Made */}
        {snapshot.decisionsMade.length > 0 && (
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-[10px] font-semibold text-green-400 uppercase mb-0.5">
                Decisions
              </p>
              <ul className="space-y-0.5">
                {snapshot.decisionsMade.map((d, i) => (
                  <li key={i} className="text-xs text-muted-foreground">
                    • {d}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Open Questions */}
        {snapshot.openQuestions.length > 0 && (
          <div className="flex items-start gap-2">
            <HelpCircle className="w-3.5 h-3.5 text-yellow-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-[10px] font-semibold text-yellow-400 uppercase mb-0.5">
                Open Questions
              </p>
              <ul className="space-y-0.5">
                {snapshot.openQuestions.map((q, i) => (
                  <li key={i} className="text-xs text-muted-foreground">
                    • {q}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Unresolved Issues */}
        {snapshot.unresolvedIssues.length > 0 && (
          <div className="flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-orange-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-[10px] font-semibold text-orange-400 uppercase mb-0.5">
                Unresolved
              </p>
              <ul className="space-y-0.5">
                {snapshot.unresolvedIssues.map((u, i) => (
                  <li key={i} className="text-xs text-muted-foreground">
                    • {u}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Participants */}
        {snapshot.participantSummary.length > 0 && (
          <div className="flex items-start gap-2">
            <Users className="w-3.5 h-3.5 text-blue-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-[10px] font-semibold text-blue-400 uppercase mb-0.5">
                Participants
              </p>
              <ul className="space-y-0.5">
                {snapshot.participantSummary.map((p, i) => (
                  <li key={i} className="text-xs text-muted-foreground">
                    <span className="text-foreground font-medium">{p.name}</span>:{' '}
                    {p.lastAction}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Suggested Next Step */}
        <div className="flex items-start gap-2 p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
          <ArrowRight className="w-3.5 h-3.5 text-purple-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-[10px] font-semibold text-purple-400 uppercase mb-0.5">
              Next Step
            </p>
            <p className="text-xs text-foreground">
              {snapshot.suggestedNextStep}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
