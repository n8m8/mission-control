'use client';

import { useState, useEffect, useCallback } from 'react';
import { Task } from '@/lib/types';
import { PlanApprovalCard } from './PlanApprovalCard';
import { Bot, RefreshCw, Inbox } from 'lucide-react';

interface PendingPlansPanelProps {
  workspaceId?: string;
}

export function PendingPlansPanel({ workspaceId = 'default' }: PendingPlansPanelProps) {
  const [plans, setPlans] = useState<(Task & { subtasks?: Task[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlans = useCallback(async () => {
    try {
      const res = await fetch(`/api/plans?workspace=${workspaceId}&status=pending`);
      if (!res.ok) throw new Error('Failed to fetch plans');
      const data = await res.json();
      setPlans(data.plans || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
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
        // Ignore parse errors (ping messages, etc.)
      }
    };

    eventSource.onerror = () => {
      // Reconnect handled automatically by EventSource
    };

    return () => {
      eventSource.close();
    };
  }, [fetchPlans]);

  const handleApprove = async (taskId: string) => {
    const res = await fetch(`/api/plans/${taskId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approved_by: 'human' }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to approve');
    }

    // Remove from local state (SSE will also trigger this)
    setPlans((prev) => prev.filter((p) => p.id !== taskId));
  };

  const handleReject = async (taskId: string, reason?: string) => {
    const res = await fetch(`/api/plans/${taskId}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rejected_by: 'human', reason }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to reject');
    }

    // Remove from local state (SSE will also trigger this)
    setPlans((prev) => prev.filter((p) => p.id !== taskId));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 text-subtext0 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red/10 border border-red/30 rounded-lg">
        <p className="text-sm text-red">{error}</p>
        <button
          onClick={fetchPlans}
          className="mt-2 text-sm text-red underline hover:no-underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <Inbox className="w-12 h-12 text-surface2 mb-3" />
        <p className="text-subtext0">No pending plans</p>
        <p className="text-xs text-subtext0 mt-1">
          Agent plans will appear here for approval
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-mauve" />
          <h2 className="text-lg font-semibold text-text">Pending Plans</h2>
          <span className="px-2 py-0.5 bg-mauve/20 text-mauve text-xs font-medium rounded-full">
            {plans.length}
          </span>
        </div>
        <button
          onClick={fetchPlans}
          className="p-2 text-subtext0 hover:text-text hover:bg-surface0 rounded-lg transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-4">
        {plans.map((plan) => (
          <PlanApprovalCard
            key={plan.id}
            task={plan}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        ))}
      </div>
    </div>
  );
}
