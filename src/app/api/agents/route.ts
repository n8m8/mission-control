import { NextRequest, NextResponse } from 'next/server';
import { getOpenClawClient } from '@/lib/openclaw/client';

interface OpenClawAgent {
  agentId: string;
  name?: string;
  isDefault?: boolean;
  heartbeat?: {
    enabled: boolean;
    every: string;
  };
  sessions?: {
    count: number;
    recent: Array<{
      key: string;
      updatedAt: number;
    }>;
  };
}

interface OpenClawHealthResponse {
  agents?: OpenClawAgent[];
}

// Map OpenClaw agent to our Agent format
function mapOpenClawAgent(oc: OpenClawAgent, index: number) {
  // Map common agent IDs to friendly names and emojis
  const agentMeta: Record<string, { name: string; role: string; emoji: string }> = {
    main: { name: 'Yvette', role: 'Executive Assistant', emoji: '💅' },
    dev: { name: 'Dev', role: 'Developer', emoji: '👩‍💻' },
    pro: { name: 'Pro', role: 'Professional', emoji: '🎯' },
    research: { name: 'Research', role: 'Researcher', emoji: '🔬' },
    github: { name: 'GitHub', role: 'GitHub Integration', emoji: '🐙' },
    paypls: { name: 'PayPls', role: 'Payment Agent', emoji: '💸' },
  };

  const meta = agentMeta[oc.agentId] || {
    name: oc.name || oc.agentId,
    role: 'Agent',
    emoji: '🤖',
  };

  return {
    id: oc.agentId,
    name: oc.name || meta.name,
    role: meta.role,
    description: `OpenClaw agent: ${oc.agentId}`,
    avatar_emoji: meta.emoji,
    status: 'standby' as const,
    is_master: oc.isDefault || oc.agentId === 'main',
    workspace_id: 'default',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    // OpenClaw-specific fields
    openclaw_agent_id: oc.agentId,
    heartbeat_enabled: oc.heartbeat?.enabled ?? false,
    session_count: oc.sessions?.count ?? 0,
  };
}

// GET /api/agents - List agents from OpenClaw
export async function GET(request: NextRequest) {
  try {
    const workspaceId = request.nextUrl.searchParams.get('workspace_id');
    
    const client = getOpenClawClient();

    if (!client.isConnected()) {
      try {
        await client.connect();
      } catch {
        // Return empty array if can't connect
        console.warn('Could not connect to OpenClaw, returning empty agents list');
        return NextResponse.json([]);
      }
    }

    // Get health which includes agents list
    const health = await client.call<OpenClawHealthResponse>('health');
    
    if (!health?.agents) {
      return NextResponse.json([]);
    }

    const agents = health.agents.map((oc, idx) => mapOpenClawAgent(oc, idx));
    
    // Sort: master first, then by name
    agents.sort((a, b) => {
      if (a.is_master && !b.is_master) return -1;
      if (!a.is_master && b.is_master) return 1;
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json(agents);
  } catch (error) {
    console.error('Failed to fetch agents from OpenClaw:', error);
    return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 });
  }
}

// POST /api/agents - Not supported (agents are defined in OpenClaw config)
export async function POST() {
  return NextResponse.json(
    { error: 'Agents are managed in OpenClaw configuration. Use openclaw.json to add new agents.' },
    { status: 400 }
  );
}
