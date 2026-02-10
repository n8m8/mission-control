/**
 * WebSocket module exports
 * 
 * Usage:
 *   import { wsServer, initWebSocket } from '@/lib/websocket';
 *   
 *   // Start server (usually in instrumentation.ts or layout)
 *   initWebSocket();
 *   
 *   // Broadcast from API routes
 *   wsServer.broadcastTaskUpdate({ task_id: '...', changes: {...} });
 */

import { wsServer as server, startWebSocketServer } from './server';

export const wsServer = server;
export { startWebSocketServer };

/**
 * Initialize WebSocket server (idempotent)
 */
export function initWebSocket(port: number = 3100): void {
  startWebSocketServer(port);
}
