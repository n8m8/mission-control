/**
 * Next.js Instrumentation
 * Runs once when the server starts
 * 
 * See: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Only run on server
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initWebSocket } = await import('./lib/websocket');
    
    const wsPort = parseInt(process.env.WS_PORT || '3100', 10);
    console.log(`[Instrumentation] Starting WebSocket server on port ${wsPort}...`);
    
    initWebSocket(wsPort);
  }
}
