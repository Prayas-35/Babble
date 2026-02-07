'use client';

import {
  Send,
  ClipboardList,
  UserPlus,
  Bell,
  AlertOctagon,
  FileEdit,
  Radio,
  Loader2,
  X,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { SuggestedAction } from '@/lib/types/inbox';
import { ACTION_TYPE_LABELS, PRIORITY_COLORS } from '@/lib/types/inbox';

interface SuggestedActionsProps {
  actions: SuggestedAction[];
  loading: boolean;
  onExecute: (action: SuggestedAction) => void;
  onClose: () => void;
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  send_followup: <Send className="w-3.5 h-3.5" />,
  create_task: <ClipboardList className="w-3.5 h-3.5" />,
  assign_task: <UserPlus className="w-3.5 h-3.5" />,
  schedule_reminder: <Bell className="w-3.5 h-3.5" />,
  escalate: <AlertOctagon className="w-3.5 h-3.5" />,
  draft_reply: <FileEdit className="w-3.5 h-3.5" />,
  broadcast: <Radio className="w-3.5 h-3.5" />,
};

export function SuggestedActions({
  actions,
  loading,
  onExecute,
  onClose,
}: SuggestedActionsProps) {
  if (loading) {
    return (
      <div className="border-t border-border p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-semibold text-foreground uppercase tracking-wide">
            Suggested Actions
          </h4>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-6 w-6"
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
        <div className="flex items-center justify-center py-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <p className="text-xs">Generating actions...</p>
          </div>
        </div>
      </div>
    );
  }

  if (actions.length === 0) return null;

  return (
    <div className="border-t border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold text-foreground uppercase tracking-wide">
          Suggested Actions
        </h4>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-6 w-6"
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
      <div className="space-y-2">
        {actions.map((action, i) => (
          <button
            key={i}
            onClick={() => onExecute(action)}
            className="w-full p-3 rounded-lg bg-secondary/50 border border-border hover:bg-secondary/80 transition-colors text-left group"
          >
            <div className="flex items-start gap-3">
              {/* Icon */}
              <div className="mt-0.5 text-muted-foreground group-hover:text-foreground transition-colors">
                {ACTION_ICONS[action.type] || (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-foreground">
                    {action.title}
                  </span>
                  <span
                    className={cn(
                      'text-[10px] px-1.5 py-0.5 rounded font-medium',
                      PRIORITY_COLORS[action.priority] ||
                        PRIORITY_COLORS.medium,
                    )}
                  >
                    {action.priority}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mb-1.5">
                  {action.description}
                </p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                    {ACTION_TYPE_LABELS[action.type] || action.type}
                  </span>
                  {action.requiredInputs.length > 0 && (
                    <span className="text-[10px] text-muted-foreground">
                      Needs: {action.requiredInputs.join(', ')}
                    </span>
                  )}
                </div>
              </div>

              {/* Execute arrow */}
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors mt-0.5" />
            </div>
          </button>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground mt-2 text-center">
        Click an action to confirm and execute
      </p>
    </div>
  );
}
