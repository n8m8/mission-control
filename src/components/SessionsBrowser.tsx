'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, RefreshCw, AlertCircle, Clock, User, Bot, Zap } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ChatHistoryPanel } from './ChatHistoryPanel';

interface SessionInfo {
  key: string;
  kind?: string;
  displayName?: string;
  chatType?: string;
  channel?: string;
  subject?: string;
  updatedAt?: number;
  totalTokens?: number;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
}

export function SessionsBrowser() {
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<SessionInfo | null>(null);
  const [filter, setFilter] = useState<'all' | 'direct' | 'group' | 'cron'>('all');

  const fetchSessions = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/openclaw/sessions');
      if (!res.ok) {
        throw new Error('Failed to fetch sessions');
      }
      const data = await res.json();
      // Sort by updatedAt descending
      const sorted = (data.sessions || []).sort((a: SessionInfo, b: SessionInfo) => 
        (b.updatedAt || 0) - (a.updatedAt || 0)
      );
      setSessions(sorted);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const filteredSessions = sessions.filter(session => {
    if (filter === 'all') return true;
    if (filter === 'direct') return session.kind === 'direct' && !session.key.includes('cron');
    if (filter === 'group') return session.kind === 'group';
    if (filter === 'cron') return session.key.includes('cron');
    return true;
  });

  const getSessionIcon = (session: SessionInfo) => {
    if (session.key.includes('cron')) return '⏰';
    if (session.kind === 'group') return '👥';
    if (session.channel === 'telegram') return '✈️';
    if (session.channel === 'discord') return '🎮';
    return '💬';
  };

  const getSessionName = (session: SessionInfo) => {
    if (session.displayName) return session.displayName;
    if (session.subject) return session.subject;
    if (session.key.includes('cron')) {
      const cronId = session.key.split(':').pop()?.slice(0, 8);
      return `Cron Job (${cronId}...)`;
    }
    if (session.key === 'agent:main:main') return 'Main Session';
    return session.key.split(':').slice(-1)[0];
  };

  const formatTokens = (n?: number) => {
    if (!n) return '0';
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toString();
  };

  if (loading && sessions.length === 0) {
    return (
      <div className="p-8 flex items-center justify-center">
        <RefreshCw className="w-5 h-5 animate-spin text-mc-text-secondary" />
        <span className="ml-2 text-mc-text-secondary">Loading sessions...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="w-8 h-8 text-mc-accent-red mx-auto mb-2" />
        <p className="text-mc-accent-red">{error}</p>
        <button
          onClick={fetchSessions}
          className="mt-2 text-sm text-mc-accent hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-mc-accent" />
          <h3 className="text-lg font-semibold">Sessions</h3>
          <span className="text-sm text-mc-text-secondary">({sessions.length})</span>
        </div>
        <button
          onClick={fetchSessions}
          disabled={loading}
          className="p-2 hover:bg-mc-bg-tertiary rounded"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 text-mc-text-secondary ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-4">
        {(['all', 'direct', 'group', 'cron'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
              filter === f
                ? 'bg-mc-accent text-mc-bg'
                : 'bg-mc-bg text-mc-text-secondary hover:bg-mc-bg-tertiary'
            }`}
          >
            {f === 'all' ? 'All' : f === 'direct' ? 'Direct' : f === 'group' ? 'Groups' : 'Cron'}
          </button>
        ))}
      </div>

      {filteredSessions.length === 0 ? (
        <div className="text-center py-8 text-mc-text-secondary">
          <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No sessions found</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {filteredSessions.map((session) => (
            <button
              key={session.key}
              onClick={() => setSelectedSession(session)}
              className="w-full p-3 bg-mc-bg rounded-lg border border-mc-border hover:border-mc-accent/50 transition-colors text-left"
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{getSessionIcon(session)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{getSessionName(session)}</span>
                    {session.key === 'agent:main:main' && (
                      <span className="px-1.5 py-0.5 bg-mc-accent/20 text-mc-accent text-xs rounded">
                        Main
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-mc-text-secondary">
                    {session.updatedAt && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(new Date(session.updatedAt), { addSuffix: true })}
                      </span>
                    )}
                    {session.totalTokens !== undefined && session.totalTokens > 0 && (
                      <span className="flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        {formatTokens(session.totalTokens)} tokens
                      </span>
                    )}
                    {session.model && (
                      <span className="text-mc-accent-purple">{session.model.split('/').pop()}</span>
                    )}
                  </div>
                </div>
                <MessageSquare className="w-4 h-4 text-mc-text-secondary" />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Chat History Modal */}
      {selectedSession && (
        <ChatHistoryPanel
          sessionKey={selectedSession.key}
          taskTitle={getSessionName(selectedSession)}
          onClose={() => setSelectedSession(null)}
        />
      )}
    </div>
  );
}
