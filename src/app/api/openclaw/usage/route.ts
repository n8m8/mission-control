import { NextResponse } from 'next/server';
import { getOpenClawClient } from '@/lib/openclaw/client';

interface SessionInfo {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}

interface HealthResponse {
  uptimeMs?: number;
  sessions?: {
    count?: number;
    recent?: SessionInfo[];
  };
}

interface UsageStatusResponse {
  totalInputTokens?: number;
  totalOutputTokens?: number;
  totalTokens?: number;
  estimatedCost?: number;
}

// GET /api/openclaw/usage - Get usage statistics from OpenClaw
export async function GET() {
  try {
    const client = getOpenClawClient();

    if (!client.isConnected()) {
      try {
        await client.connect();
      } catch {
        return NextResponse.json(
          { error: 'Failed to connect to OpenClaw Gateway' },
          { status: 503 }
        );
      }
    }

    // Get health for uptime and session count
    const health = await client.call<HealthResponse>('health');
    
    // Try to get usage status if available
    let usageStatus: UsageStatusResponse | null = null;
    try {
      usageStatus = await client.call<UsageStatusResponse>('usage.status');
    } catch {
      // usage.status might not be available, continue with health data
    }

    // Get session list to calculate token usage
    let sessions: SessionInfo[] = [];
    try {
      const sessionList = await client.call<{ sessions?: SessionInfo[] }>('sessions.list');
      sessions = sessionList?.sessions || [];
    } catch {
      // Continue without session data
    }

    // Calculate totals from sessions if not available from usage.status
    let totalInputTokens = usageStatus?.totalInputTokens || 0;
    let totalOutputTokens = usageStatus?.totalOutputTokens || 0;
    let totalTokens = usageStatus?.totalTokens || 0;

    if (!usageStatus && sessions.length > 0) {
      for (const session of sessions) {
        totalInputTokens += session.inputTokens || 0;
        totalOutputTokens += session.outputTokens || 0;
        totalTokens += session.totalTokens || 0;
      }
    }

    return NextResponse.json({
      totalTokens,
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      totalCost: usageStatus?.estimatedCost,
      sessions: sessions.length || health?.sessions?.count || 0,
      uptimeMs: health?.uptimeMs,
    });
  } catch (error) {
    console.error('Failed to fetch usage:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
