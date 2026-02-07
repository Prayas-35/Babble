'use client';

import {
  Sparkles,
  ArrowRight,
  HelpCircle,
  CheckCircle2,
  Loader2,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  Minus,
  Shuffle,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import type { ConversationInsightsData } from '@/lib/types/inbox';
import { PRIORITY_COLORS } from '@/lib/types/inbox';

interface ConversationInsightsProps {
  insights: ConversationInsightsData | null;
  loading: boolean;
  onClose: () => void;
  onGenerate: () => void;
}

const SENTIMENT_CONFIG: Record<
  string,
  { icon: React.ReactNode; label: string; className: string }
> = {
  positive: {
    icon: <TrendingUp className="w-3 h-3" />,
    label: 'Positive',
    className: 'bg-green-500/15 text-green-400 border-green-500/30',
  },
  neutral: {
    icon: <Minus className="w-3 h-3" />,
    label: 'Neutral',
    className: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
  },
  negative: {
    icon: <TrendingDown className="w-3 h-3" />,
    label: 'Negative',
    className: 'bg-red-500/15 text-red-400 border-red-500/30',
  },
  mixed: {
    icon: <Shuffle className="w-3 h-3" />,
    label: 'Mixed',
    className: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  },
};

export function ConversationInsights({
  insights,
  loading,
  onClose,
  onGenerate,
}: ConversationInsightsProps) {
  const [expanded, setExpanded] = useState(true);

  // Not yet generated — show trigger button
  if (!insights && !loading) {
    return (
      <div className="px-6 py-3 border-b border-border bg-secondary/20">
        <button
          onClick={onGenerate}
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors group"
        >
          <Sparkles className="w-3.5 h-3.5 group-hover:text-primary" />
          <span>Generate AI summary &amp; next steps</span>
        </button>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="px-6 py-4 border-b border-border bg-linear-to-r from-purple-500/5 to-blue-500/5">
        <div className="flex items-center gap-2.5">
          <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
          <span className="text-xs text-muted-foreground">
            Analyzing conversation...
          </span>
        </div>
      </div>
    );
  }

  if (!insights) return null;

  const sentiment = SENTIMENT_CONFIG[insights.sentiment] || SENTIMENT_CONFIG.neutral;

  return (
    <div className="border-b border-border bg-linear-to-r from-purple-500/5 via-transparent to-blue-500/5">
      {/* Header bar — always visible */}
      <div className="px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
          <p className="text-xs text-foreground truncate flex-1">
            {insights.summary}
          </p>
          <div
            className={cn(
              'flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium shrink-0',
              sentiment.className
            )}
          >
            {sentiment.icon}
            {sentiment.label}
          </div>
        </div>

        <div className="flex items-center gap-1 ml-2 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setExpanded((prev) => !prev)}
            className="h-6 w-6 text-muted-foreground"
          >
            {expanded ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-6 w-6 text-muted-foreground"
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-6 pb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Key Points */}
          {insights.keyPoints.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                <h4 className="text-[10px] font-semibold text-blue-400 uppercase tracking-wide">
                  Key Points
                </h4>
              </div>
              <ul className="space-y-1">
                {insights.keyPoints.map((point, i) => (
                  <li
                    key={i}
                    className="text-xs text-muted-foreground pl-2.5 border-l-2 border-blue-500/20"
                  >
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Next Steps */}
          {insights.nextSteps.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <ArrowRight className="w-3.5 h-3.5 text-green-400" />
                <h4 className="text-[10px] font-semibold text-green-400 uppercase tracking-wide">
                  Next Steps
                </h4>
              </div>
              <ul className="space-y-1.5">
                {insights.nextSteps.map((step, i) => (
                  <li
                    key={i}
                    className="text-xs text-foreground flex items-start gap-2"
                  >
                    <span
                      className={cn(
                        'text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 mt-0.5',
                        PRIORITY_COLORS[step.priority] || PRIORITY_COLORS.medium
                      )}
                    >
                      {step.priority}
                    </span>
                    <span>
                      {step.action}
                      <span className="text-muted-foreground ml-1">
                        — {step.owner}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Pending Questions */}
          {insights.pendingQuestions.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <HelpCircle className="w-3.5 h-3.5 text-yellow-400" />
                <h4 className="text-[10px] font-semibold text-yellow-400 uppercase tracking-wide">
                  Open Questions
                </h4>
              </div>
              <ul className="space-y-1">
                {insights.pendingQuestions.map((q, i) => (
                  <li
                    key={i}
                    className="text-xs text-muted-foreground pl-2.5 border-l-2 border-yellow-500/20"
                  >
                    {q}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
