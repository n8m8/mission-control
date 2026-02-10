import { NextResponse } from 'next/server';
import { wsServer } from '@/lib/websocket';

// GET /api/ws/status - Get WebSocket server status
export async function GET() {
  try {
    const stats = wsServer.getStats();
    
    return NextResponse.json({
      running: stats.port !== null,
      port: stats.port,
      clients: stats.clients,
    });
  } catch (error) {
    return NextResponse.json({
      running: false,
      port: null,
      clients: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
