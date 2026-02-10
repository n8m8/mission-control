'use client';

import { useState } from 'react';
import { Task } from '@/lib/types';
import { CheckCircle, XCircle, ChevronDown, ChevronRight, Bot, Clock, User } from 'lucide-react';

interface PlanApprovalCardProps {
  task: Task & { subtasks?: Task[] };
  onApprove: (taskId: string) => Promise<void>;
  onReject: (taskId: string, reason?: string) => Promise<void>;
}

export function PlanApprovalCard({ task, onApprove, onReject }: PlanApprovalCardProps) {
  const [expanded, setExpanded] = useState(true);
  const [loading, setLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);

  const handleApprove = async () => {
    setLoading(true);
    try {
      await onApprove(task.id);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!showRejectInput) {
      setShowRejectInput(true);
      return;
    }
    setLoading(true);
    try {
      await onReject(task.id, rejectReason || undefined);
    } finally {
      setLoading(false);
      setShowRejectInput(false);
      setRejectReason('');
    }
  };

  const subtasks = task.subtasks || [];

  return (
    <div className="bg-surface0 border-2 border-mauve/50 rounded-xl p-4 shadow-lg">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Bot className="w-4 h-4 text-mauve" />
            <span className="text-xs font-medium text-mauve uppercase tracking-wide">
              Agentic Plan
            </span>
            <span className="px-2 py-0.5 bg-mauve/20 text-mauve text-xs rounded-full">
              Pending Approval
            </span>
          </div>
          <h3 className="text-lg font-semibold text-text">{task.title}</h3>
          {task.description && (
            <p className="text-sm text-subtext0 mt-1">{task.description}</p>
          )}
        </div>
      </div>

      {/* Subtasks */}
      {subtasks.length > 0 && (
        <div className="mt-4">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-2 text-sm text-subtext1 hover:text-text transition-colors"
          >
            {expanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
            <span>{subtasks.length} subtasks</span>
          </button>

          {expanded && (
            <div className="mt-2 space-y-2 pl-4 border-l-2 border-mauve/30">
              {subtasks.map((subtask, index) => (
                <div
                  key={subtask.id}
                  className="flex items-start gap-3 py-2 px-3 bg-base/50 rounded-lg"
                >
                  <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-mauve/20 text-mauve text-xs font-medium rounded-full">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text">{subtask.title}</p>
                    {subtask.description && (
                      <p className="text-xs text-subtext0 mt-0.5 line-clamp-2">
                        {subtask.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Metadata */}
      <div className="flex items-center gap-4 mt-4 text-xs text-subtext0">
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <span>{new Date(task.created_at).toLocaleString()}</span>
        </div>
        {task.agent_id && (
          <div className="flex items-center gap-1">
            <User className="w-3 h-3" />
            <span>Agent: {task.agent_id}</span>
          </div>
        )}
      </div>

      {/* Reject reason input */}
      {showRejectInput && (
        <div className="mt-4">
          <input
            type="text"
            placeholder="Reason for rejection (optional)"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            className="w-full px-3 py-2 bg-base border border-surface1 rounded-lg text-sm text-text placeholder:text-subtext0 focus:outline-none focus:border-mauve"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleReject();
              if (e.key === 'Escape') {
                setShowRejectInput(false);
                setRejectReason('');
              }
            }}
            autoFocus
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 mt-4 pt-4 border-t border-surface1">
        <button
          onClick={handleApprove}
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green text-base font-medium rounded-lg hover:bg-green/90 transition-colors disabled:opacity-50"
        >
          <CheckCircle className="w-4 h-4" />
          Approve
        </button>
        <button
          onClick={handleReject}
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red text-base font-medium rounded-lg hover:bg-red/90 transition-colors disabled:opacity-50"
        >
          <XCircle className="w-4 h-4" />
          {showRejectInput ? 'Confirm Reject' : 'Reject'}
        </button>
      </div>
    </div>
  );
}
