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
function mapOpenClawAgent(oc: OpenClawAgent) {
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
    openclaw_agent_id: oc.agentId,
    heartbeat_enabled: oc.heartbeat?.enabled ?? false,
    session_count: oc.sessions?.count ?? 0,
  };
}

// GET /api/agents/[id] - Get a single agent from OpenClaw
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const client = getOpenClawClient();

    if (!client.isConnected()) {
      try {
        await client.connect();
      } catch {
        return NextResponse.json({ error: 'Could not connect to OpenClaw' }, { status: 503 });
      }
    }

    const health = await client.call<OpenClawHealthResponse>('health');
    
    if (!health?.agents) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    const ocAgent = health.agents.find(a => a.agentId === id);
    
    if (!ocAgent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    return NextResponse.json(mapOpenClawAgent(ocAgent));
  } catch (error) {
    console.error('Failed to fetch agent:', error);
    return NextResponse.json({ error: 'Failed to fetch agent' }, { status: 500 });
  }
}

// PATCH /api/agents/[id] - Not supported
export async function PATCH() {
  return NextResponse.json(
    { error: 'Agents are managed in OpenClaw configuration.' },
    { status: 400 }
  );
}

// DELETE /api/agents/[id] - Not supported
export async function DELETE() {
  return NextResponse.json(
    { error: 'Agents are managed in OpenClaw configuration.' },
    { status: 400 }
  );
}
