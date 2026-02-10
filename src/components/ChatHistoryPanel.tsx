'use client';

import { useState, useEffect, useRef } from 'react';
import { X, MessageSquare, User, Bot, Loader2, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp?: string;
  toolName?: string;
}

interface ChatHistoryPanelProps {
  sessionKey: string;
  taskTitle?: string;
  onClose: () => void;
}

export function ChatHistoryPanel({ sessionKey, taskTitle, onClose }: ChatHistoryPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/openclaw/chat-history?sessionKey=${encodeURIComponent(sessionKey)}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to fetch chat history');
      }
      const data = await res.json();
      setMessages(data.messages || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [sessionKey]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'user':
        return <User className="w-4 h-4" />;
      case 'assistant':
        return <Bot className="w-4 h-4" />;
      case 'system':
        return <MessageSquare className="w-4 h-4" />;
      default:
        return <MessageSquare className="w-4 h-4" />;
    }
  };

  const getRoleStyle = (role: string) => {
    switch (role) {
      case 'user':
        return 'bg-mc-accent/20 border-mc-accent/30';
      case 'assistant':
        return 'bg-mc-accent-purple/20 border-mc-accent-purple/30';
      case 'system':
        return 'bg-mc-bg-tertiary border-mc-border';
      case 'tool':
        return 'bg-mc-accent-cyan/10 border-mc-accent-cyan/30 font-mono text-sm';
      default:
        return 'bg-mc-bg-secondary border-mc-border';
    }
  };

  const formatContent = (content: string, role: string) => {
    if (role === 'tool') {
      // Truncate long tool outputs
      if (content.length > 500) {
        return content.slice(0, 500) + '... (truncated)';
      }
    }
    return content;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-mc-bg-secondary border border-mc-border rounded-xl w-full max-w-3xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-mc-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageSquare className="w-5 h-5 text-mc-accent" />
            <div>
              <h2 className="font-semibold">Chat History</h2>
              {taskTitle && (
                <p className="text-sm text-mc-text-secondary">{taskTitle}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchHistory}
              disabled={loading}
              className="p-2 hover:bg-mc-bg-tertiary rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-mc-bg-tertiary rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-mc-accent" />
              <span className="ml-2 text-mc-text-secondary">Loading chat history...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-mc-accent-red mb-2">Failed to load chat history</p>
              <p className="text-sm text-mc-text-secondary">{error}</p>
              <button
                onClick={fetchHistory}
                className="mt-4 px-4 py-2 bg-mc-accent text-mc-bg rounded-lg text-sm"
              >
                Retry
              </button>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12 text-mc-text-secondary">
              No messages in this session
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg border ${getRoleStyle(msg.role)}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className={`${msg.role === 'assistant' ? 'text-mc-accent-purple' : msg.role === 'user' ? 'text-mc-accent' : 'text-mc-text-secondary'}`}>
                    {getRoleIcon(msg.role)}
                  </span>
                  <span className="text-xs font-medium uppercase text-mc-text-secondary">
                    {msg.role === 'tool' ? `Tool: ${msg.toolName || 'unknown'}` : msg.role}
                  </span>
                  {msg.timestamp && (
                    <span className="text-xs text-mc-text-secondary ml-auto">
                      {formatDistanceToNow(new Date(msg.timestamp), { addSuffix: true })}
                    </span>
                  )}
                </div>
                <div className="text-sm whitespace-pre-wrap break-words">
                  {formatContent(msg.content, msg.role)}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-mc-border text-xs text-mc-text-secondary">
          Session: <code className="bg-mc-bg px-1 rounded">{sessionKey}</code>
        </div>
      </div>
    </div>
  );
}
