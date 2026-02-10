import { NextRequest } from 'next/server';
import { registerClient, unregisterClient } from '@/lib/events';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/events/stream - SSE endpoint for real-time updates
export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Register this client
      registerClient(controller);

      // Send initial connection message
      const connectMsg = `data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`;
      controller.enqueue(encoder.encode(connectMsg));

      // Keep-alive ping every 30 seconds
      const pingInterval = setInterval(() => {
        try {
          const pingMsg = `data: ${JSON.stringify({ type: 'ping', timestamp: new Date().toISOString() })}\n\n`;
          controller.enqueue(encoder.encode(pingMsg));
        } catch {
          clearInterval(pingInterval);
        }
      }, 30000);

      // Handle client disconnect
      request.signal.addEventListener('abort', () => {
        clearInterval(pingInterval);
        unregisterClient(controller);
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });
    },
    cancel() {
      // Client disconnected
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // For nginx
    },
  });
}
