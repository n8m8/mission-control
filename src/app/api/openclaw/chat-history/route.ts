import { NextRequest, NextResponse } from 'next/server';
import { getOpenClawClient } from '@/lib/openclaw/client';

interface HistoryMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp?: string;
  toolName?: string;
}

interface OpenClawHistoryResponse {
  messages?: Array<{
    role: string;
    content?: string | Array<{ type: string; text?: string; tool_use_id?: string; content?: string }>;
    timestamp?: string;
    name?: string;
  }>;
}

// GET /api/openclaw/chat-history?sessionKey=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionKey = searchParams.get('sessionKey');
    const limit = parseInt(searchParams.get('limit') || '100');

    if (!sessionKey) {
      return NextResponse.json(
        { error: 'sessionKey is required' },
        { status: 400 }
      );
    }

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

    // Call OpenClaw's chat.history method
    const response = await client.call<OpenClawHistoryResponse>('chat.history', {
      sessionKey,
      limit
    });

    // Transform messages to our format
    const messages: HistoryMessage[] = [];

    if (response?.messages) {
      for (const msg of response.messages) {
        // Handle different content formats
        let content = '';
        let toolName: string | undefined;

        if (typeof msg.content === 'string') {
          content = msg.content;
        } else if (Array.isArray(msg.content)) {
          // Handle array content (tool results, etc.)
          const textParts = msg.content
            .filter(part => part.type === 'text' && part.text)
            .map(part => part.text);
          content = textParts.join('\n');

          // Check for tool use
          const toolPart = msg.content.find(part => part.type === 'tool_result');
          if (toolPart) {
            toolName = msg.name || 'tool';
            content = toolPart.content || content;
          }
        }

        if (content || msg.role === 'system') {
          messages.push({
            role: msg.role as HistoryMessage['role'],
            content: content || '(empty)',
            timestamp: msg.timestamp,
            toolName
          });
        }
      }
    }

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Failed to fetch chat history:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
