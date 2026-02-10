import { NextResponse } from 'next/server';
import { getOpenClawClient } from '@/lib/openclaw/client';

interface SkillStatus {
  name: string;
  description?: string;
  location: string;
}

interface SkillsStatusResponse {
  skills?: SkillStatus[];
  count?: number;
}

// GET /api/openclaw/skills - Get installed skills from OpenClaw
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

    const response = await client.call<SkillsStatusResponse>('skills.status');
    
    const skills = (response?.skills || []).map(skill => ({
      ...skill,
      enabled: true, // All returned skills are enabled
    }));

    return NextResponse.json({ 
      skills,
      count: skills.length 
    });
  } catch (error) {
    console.error('Failed to fetch skills:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
