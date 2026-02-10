'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { WSMessage, Task } from '@/lib/types';

interface UseWebSocketOptions {
  url?: string;
  workspaceId?: string;
  onTaskUpdate?: (taskId: string, changes: Partial<Task>) => void;
  onPlanCreated?: (parentTaskId: string, subtasks: Task[]) => void;
  onPlanApproved?: (parentTaskId: string) => void;
  onPlanRejected?: (parentTaskId: string) => void;
  onApprovalRequest?: (taskId: string, agentId: string, summary: string, subtasks: Array<{ id: string; title: string }>) => void;
  onProgress?: (taskId: string, progress: number, currentStep?: string) => void;
}

interface WebSocketState {
  connected: boolean;
  clientId: string | null;
  error: string | null;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    url = `ws://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:3100`,
    workspaceId = 'default',
    onTaskUpdate,
    onPlanCreated,
    onPlanApproved,
    onPlanRejected,
    onApprovalRequest,
    onProgress,
  } = options;

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [state, setState] = useState<WebSocketState>({
    connected: false,
    clientId: null,
    error: null,
  });

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setState((s) => ({ ...s, connected: true, error: null }));
        
        // Subscribe to workspace
        ws.send(JSON.stringify({
          type: 'subscribe',
          payload: { workspaces: [workspaceId, '*'] },
        }));
      };

      ws.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data);
          handleMessage(message);
        } catch {
          // Ignore parse errors
        }
      };

      ws.onclose = () => {
        setState((s) => ({ ...s, connected: false }));
        wsRef.current = null;

        // Reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 3000);
      };

      ws.onerror = () => {
        setState((s) => ({ ...s, error: 'WebSocket connection error' }));
      };
    } catch (err) {
      setState((s) => ({ ...s, error: 'Failed to connect to WebSocket' }));
    }
  }, [url, workspaceId]);

  const handleMessage = useCallback((message: WSMessage) => {
    const payload = message.payload as Record<string, unknown>;

    switch (message.type) {
      case 'connected':
        setState((s) => ({ ...s, clientId: payload.clientId as string }));
        break;

      case 'task_update':
        onTaskUpdate?.(payload.task_id as string, payload.changes as Partial<Task>);
        break;

      case 'plan_update':
        const status = payload.status as string;
        if (status === 'created') {
          onPlanCreated?.(payload.parent_task_id as string, payload.subtasks as Task[]);
        } else if (status === 'approved') {
          onPlanApproved?.(payload.parent_task_id as string);
        } else if (status === 'rejected') {
          onPlanRejected?.(payload.parent_task_id as string);
        }
        break;

      case 'approval_request':
        onApprovalRequest?.(
          payload.task_id as string,
          payload.agent_id as string,
          payload.plan_summary as string,
          payload.subtasks as Array<{ id: string; title: string }>
        );
        break;

      case 'progress_update':
        onProgress?.(
          payload.task_id as string,
          payload.progress as number,
          payload.current_step as string | undefined
        );
        break;
    }
  }, [onTaskUpdate, onPlanCreated, onPlanApproved, onPlanRejected, onApprovalRequest, onProgress]);

  // Connect on mount
  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  // Subscribe to specific tasks
  const subscribeToTask = useCallback((taskId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'subscribe',
        payload: { tasks: [taskId] },
      }));
    }
  }, []);

  const unsubscribeFromTask = useCallback((taskId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'unsubscribe',
        payload: { tasks: [taskId] },
      }));
    }
  }, []);

  return {
    ...state,
    subscribeToTask,
    unsubscribeFromTask,
  };
}
