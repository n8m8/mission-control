/**
 * WebSocket Server for Mission Control
 * Provides real-time bidirectional communication for task updates
 */

import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage } from 'http';
import type { Task, WSMessage, WSTaskUpdate, WSPlanUpdate } from '../types';

interface Client {
  ws: WebSocket;
  id: string;
  subscribedWorkspaces: Set<string>;
  subscribedTasks: Set<string>;
}

class MCWebSocketServer {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, Client> = new Map();
  private clientIdCounter = 0;

  start(port: number = 3001): void {
    if (this.wss) {
      console.log('[WS] Server already running');
      return;
    }

    this.wss = new WebSocketServer({ port });

    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      const clientId = `client_${++this.clientIdCounter}`;
      const client: Client = {
        ws,
        id: clientId,
        subscribedWorkspaces: new Set(['default']), // Subscribe to default workspace
        subscribedTasks: new Set(),
      };

      this.clients.set(clientId, client);
      console.log(`[WS] Client connected: ${clientId} (${this.clients.size} total)`);

      // Send welcome message
      this.send(ws, {
        type: 'connected',
        payload: { clientId, timestamp: new Date().toISOString() },
      });

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString()) as WSMessage;
          this.handleMessage(client, message);
        } catch (err) {
          console.error('[WS] Failed to parse message:', err);
        }
      });

      ws.on('close', () => {
        this.clients.delete(clientId);
        console.log(`[WS] Client disconnected: ${clientId} (${this.clients.size} remaining)`);
      });

      ws.on('error', (err) => {
        console.error(`[WS] Client error (${clientId}):`, err);
        this.clients.delete(clientId);
      });

      // Ping/pong for keepalive
      const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.ping();
        } else {
          clearInterval(pingInterval);
        }
      }, 30000);

      ws.on('close', () => clearInterval(pingInterval));
    });

    console.log(`[WS] WebSocket server started on port ${port}`);
  }

  stop(): void {
    if (this.wss) {
      this.wss.close();
      this.wss = null;
      this.clients.clear();
      console.log('[WS] Server stopped');
    }
  }

  private handleMessage(client: Client, message: WSMessage): void {
    switch (message.type) {
      case 'subscribe':
        this.handleSubscribe(client, message.payload as { workspaces?: string[]; tasks?: string[] });
        break;

      case 'unsubscribe':
        this.handleUnsubscribe(client, message.payload as { workspaces?: string[]; tasks?: string[] });
        break;

      default:
        console.log(`[WS] Unknown message type: ${message.type}`);
    }
  }

  private handleSubscribe(client: Client, payload: { workspaces?: string[]; tasks?: string[] }): void {
    if (payload.workspaces) {
      payload.workspaces.forEach((w) => client.subscribedWorkspaces.add(w));
    }
    if (payload.tasks) {
      payload.tasks.forEach((t) => client.subscribedTasks.add(t));
    }

    this.send(client.ws, {
      type: 'subscribed',
      payload: {
        workspaces: Array.from(client.subscribedWorkspaces),
        tasks: Array.from(client.subscribedTasks),
      },
    });
  }

  private handleUnsubscribe(client: Client, payload: { workspaces?: string[]; tasks?: string[] }): void {
    if (payload.workspaces) {
      payload.workspaces.forEach((w) => client.subscribedWorkspaces.delete(w));
    }
    if (payload.tasks) {
      payload.tasks.forEach((t) => client.subscribedTasks.delete(t));
    }
  }

  private send(ws: WebSocket, data: unknown): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }

  // ========== Public broadcast methods ==========

  /**
   * Broadcast a task update to relevant clients
   */
  broadcastTaskUpdate(update: WSTaskUpdate, workspaceId: string = 'default'): void {
    const message: WSMessage = {
      type: 'task_update',
      payload: update,
      timestamp: new Date().toISOString(),
    };

    this.broadcastToWorkspace(workspaceId, message);
  }

  /**
   * Broadcast a plan creation/update
   */
  broadcastPlanUpdate(update: WSPlanUpdate, workspaceId: string = 'default'): void {
    const message: WSMessage = {
      type: 'plan_update',
      payload: update,
      timestamp: new Date().toISOString(),
    };

    this.broadcastToWorkspace(workspaceId, message);
  }

  /**
   * Broadcast an approval request
   */
  broadcastApprovalRequest(taskId: string, agentId: string, planSummary: string, subtasks: Array<{ id: string; title: string }>, workspaceId: string = 'default'): void {
    const message: WSMessage = {
      type: 'approval_request',
      payload: { task_id: taskId, agent_id: agentId, plan_summary: planSummary, subtasks },
      timestamp: new Date().toISOString(),
    };

    this.broadcastToWorkspace(workspaceId, message);
  }

  /**
   * Broadcast progress update for a task
   */
  broadcastProgress(taskId: string, progress: number, currentStep?: string, agentId?: string): void {
    const message: WSMessage = {
      type: 'progress_update',
      payload: { task_id: taskId, progress, current_step: currentStep, agent_id: agentId },
      timestamp: new Date().toISOString(),
    };

    // Broadcast to clients subscribed to this specific task
    this.clients.forEach((client) => {
      if (client.subscribedTasks.has(taskId)) {
        this.send(client.ws, message);
      }
    });

    // Also broadcast to all workspace subscribers
    this.broadcastToWorkspace('default', message);
  }

  /**
   * Broadcast to all clients subscribed to a workspace
   */
  private broadcastToWorkspace(workspaceId: string, message: WSMessage): void {
    let sentCount = 0;
    this.clients.forEach((client) => {
      if (client.subscribedWorkspaces.has(workspaceId) || client.subscribedWorkspaces.has('*')) {
        this.send(client.ws, message);
        sentCount++;
      }
    });

    if (sentCount > 0) {
      console.log(`[WS] Broadcast ${message.type} to ${sentCount} client(s)`);
    }
  }

  /**
   * Broadcast to all connected clients
   */
  broadcastAll(message: WSMessage): void {
    this.clients.forEach((client) => {
      this.send(client.ws, message);
    });
  }

  /**
   * Get connection stats
   */
  getStats(): { clients: number; port: number | null } {
    return {
      clients: this.clients.size,
      port: this.wss ? (this.wss.options.port as number) : null,
    };
  }
}

// Use global to persist across hot reloads and module boundaries
declare global {
  // eslint-disable-next-line no-var
  var __mcWebSocketServer: MCWebSocketServer | undefined;
}

function getOrCreateServer(): MCWebSocketServer {
  if (!global.__mcWebSocketServer) {
    global.__mcWebSocketServer = new MCWebSocketServer();
  }
  return global.__mcWebSocketServer;
}

export const wsServer = getOrCreateServer();

/**
 * Start the WebSocket server (call from instrumentation or first API request)
 */
export function startWebSocketServer(port: number = 3100): MCWebSocketServer {
  const server = getOrCreateServer();
  if (server.getStats().port === null) {
    try {
      server.start(port);
    } catch (e) {
      // Port might already be in use
      console.error('[WS] Failed to start server:', e);
    }
  }
  return server;
}
