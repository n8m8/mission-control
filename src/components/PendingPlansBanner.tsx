'use client';

import { useState, useEffect, useCallback } from 'react';
import { Task } from '@/lib/types';
import { Bot, ChevronDown, ChevronUp, CheckCircle, XCircle, X } from 'lucide-react';

interface PendingPlansBannerProps {
  workspaceId?: string;
}

export function PendingPlansBanner({ workspaceId = 'default' }: PendingPlansBannerProps) {
  const [plans, setPlans] = useState<(Task & { subtasks?: Task[] })[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchPlans = useCallback(async () => {
    try {
      const res = await fetch(`/api/plans?workspace=${workspaceId}&status=pending`);
      if (res.ok) {
        const data = await res.json();
        setPlans(data.plans || []);
      }
    } catch (err) {
      console.error('Failed to fetch plans:', err);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchPlans();

    // Subscribe to SSE for real-time updates
    const eventSource = new EventSource('/api/events/stream');

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'plan_created') {
          setPlans((prev) => [data.payload, ...prev]);
        } else if (data.type === 'plan_approved' || data.type === 'plan_rejected') {
          setPlans((prev) => prev.filter((p) => p.id !== data.payload.id));
        }
      } catch {
        // Ignore parse errors
      }
    };

    return () => eventSource.close();
  }, [fetchPlans]);

  const handleApprove = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading(true);
    try {
      const res = await fetch(`/api/plans/${taskId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved_by: 'human' }),
      });
      if (res.ok) {
        setPlans((prev) => prev.filter((p) => p.id !== taskId));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading(true);
    try {
      const res = await fetch(`/api/plans/${taskId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejected_by: 'human' }),
      });
      if (res.ok) {
        setPlans((prev) => prev.filter((p) => p.id !== taskId));
      }
    } finally {
      setLoading(false);
    }
  };

  if (plans.length === 0) return null;

  return (
    <div className="bg-mauve/10 border-b border-mauve/30">
      {/* Collapsed banner */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-2 flex items-center justify-between hover:bg-mauve/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Bot className="w-4 h-4 text-mauve" />
          <span className="text-sm font-medium text-mauve">
            {plans.length} agentic plan{plans.length !== 1 ? 's' : ''} awaiting approval
          </span>
        </div>
        <div className="flex items-center gap-2">
          {!expanded && plans.length > 0 && (
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => handleApprove(plans[0].id, e)}
                disabled={loading}
                className="p-1 text-green hover:bg-green/20 rounded transition-colors disabled:opacity-50"
                title="Approve first plan"
              >
                <CheckCircle className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => handleReject(plans[0].id, e)}
                disabled={loading}
                className="p-1 text-red hover:bg-red/20 rounded transition-colors disabled:opacity-50"
                title="Reject first plan"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>
          )}
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-subtext0" />
          ) : (
            <ChevronDown className="w-4 h-4 text-subtext0" />
          )}
        </div>
      </button>

      {/* Expanded plans list */}
      {expanded && (
        <div className="px-4 pb-3 space-y-2">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="bg-surface0 rounded-lg p-3 border border-mauve/20"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-text truncate">
                    {plan.title}
                  </h4>
                  {plan.description && (
                    <p className="text-xs text-subtext0 mt-0.5 line-clamp-1">
                      {plan.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-mauve">
                      {plan.subtasks?.length || 0} subtasks
                    </span>
                    <span className="text-xs text-subtext0">
                      by {plan.agent_id || 'agent'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={(e) => handleApprove(plan.id, e)}
                    disabled={loading}
                    className="px-2 py-1 text-xs font-medium bg-green text-base rounded hover:bg-green/90 transition-colors disabled:opacity-50 flex items-center gap-1"
                  >
                    <CheckCircle className="w-3 h-3" />
                    Approve
                  </button>
                  <button
                    onClick={(e) => handleReject(plan.id, e)}
                    disabled={loading}
                    className="px-2 py-1 text-xs font-medium bg-red text-base rounded hover:bg-red/90 transition-colors disabled:opacity-50 flex items-center gap-1"
                  >
                    <X className="w-3 h-3" />
                    Reject
                  </button>
                </div>
              </div>

              {/* Subtasks preview */}
              {plan.subtasks && plan.subtasks.length > 0 && (
                <div className="mt-2 pt-2 border-t border-surface1">
                  <div className="flex flex-wrap gap-1">
                    {plan.subtasks.slice(0, 5).map((st, i) => (
                      <span
                        key={st.id}
                        className="px-2 py-0.5 bg-mauve/10 text-mauve text-xs rounded"
                      >
                        {i + 1}. {st.title.length > 20 ? st.title.slice(0, 20) + '...' : st.title}
                      </span>
                    ))}
                    {plan.subtasks.length > 5 && (
                      <span className="px-2 py-0.5 text-subtext0 text-xs">
                        +{plan.subtasks.length - 5} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
