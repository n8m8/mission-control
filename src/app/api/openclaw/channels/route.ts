import { NextResponse } from 'next/server';
import { getOpenClawClient } from '@/lib/openclaw/client';

interface ChannelProbe {
  ok: boolean;
  status: string | null;
  error: string | null;
  elapsedMs: number;
  bot?: {
    id: number;
    username: string;
    canJoinGroups: boolean;
    canReadAllGroupMessages: boolean;
  };
  webhook?: {
    url: string;
    hasCustomCert: boolean;
  };
}

interface ChannelStatus {
  configured: boolean;
  tokenSource: string;
  running: boolean;
  mode: string | null;
  lastStartAt: string | null;
  lastStopAt: string | null;
  lastError: string | null;
  probe: ChannelProbe;
  lastProbeAt: number;
  accountId: string;
}

interface HealthResponse {
  channels?: Record<string, ChannelStatus>;
  channelOrder?: string[];
  channelLabels?: Record<string, string>;
}

export interface ChannelInfo {
  id: string;
  name: string;
  type: string;
  configured: boolean;
  connected: boolean;
  running: boolean;
  error: string | null;
  botUsername?: string;
  lastProbeAt?: string;
}

// GET /api/openclaw/channels - Get channel status from OpenClaw
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

    const health = await client.call<HealthResponse>('health');
    
    if (!health?.channels) {
      return NextResponse.json({ channels: [] });
    }

    const channels: ChannelInfo[] = [];
    const order = health.channelOrder || Object.keys(health.channels);
    const labels = health.channelLabels || {};

    for (const channelId of order) {
      const status = health.channels[channelId];
      if (!status) continue;

      channels.push({
        id: channelId,
        name: labels[channelId] || channelId,
        type: channelId,
        configured: status.configured,
        connected: status.probe?.ok ?? false,
        running: status.running,
        error: status.lastError || status.probe?.error || null,
        botUsername: status.probe?.bot?.username,
        lastProbeAt: status.lastProbeAt ? new Date(status.lastProbeAt).toISOString() : undefined,
      });
    }

    return NextResponse.json({ channels });
  } catch (error) {
    console.error('Failed to fetch channels:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
