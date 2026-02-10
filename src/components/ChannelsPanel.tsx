'use client';

import { useState, useEffect } from 'react';
import { Radio, Wifi, WifiOff, RefreshCw, MessageSquare, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ChannelInfo {
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

const channelIcons: Record<string, string> = {
  telegram: '✈️',
  discord: '🎮',
  slack: '💬',
  whatsapp: '📱',
  signal: '🔒',
  imessage: '💬',
  webchat: '🌐',
};

export function ChannelsPanel() {
  const [channels, setChannels] = useState<ChannelInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchChannels = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/openclaw/channels');
      if (!res.ok) {
        throw new Error('Failed to fetch channels');
      }
      const data = await res.json();
      setChannels(data.channels || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChannels();
    // Refresh every 30 seconds
    const interval = setInterval(fetchChannels, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading && channels.length === 0) {
    return (
      <div className="p-4 flex items-center justify-center">
        <RefreshCw className="w-5 h-5 animate-spin text-mc-text-secondary" />
        <span className="ml-2 text-mc-text-secondary">Loading channels...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <AlertCircle className="w-8 h-8 text-mc-accent-red mx-auto mb-2" />
        <p className="text-mc-accent-red">{error}</p>
        <button
          onClick={fetchChannels}
          className="mt-2 text-sm text-mc-accent hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (channels.length === 0) {
    return (
      <div className="p-4 text-center text-mc-text-secondary">
        <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>No channels configured</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-mc-text-secondary" />
          <span className="text-sm font-medium uppercase tracking-wider text-mc-text-secondary">
            Channels
          </span>
        </div>
        <button
          onClick={fetchChannels}
          disabled={loading}
          className="p-1 hover:bg-mc-bg-tertiary rounded"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 text-mc-text-secondary ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {channels.map((channel) => (
        <div
          key={channel.id}
          className="mx-2 p-3 bg-mc-bg rounded-lg border border-mc-border"
        >
          <div className="flex items-center gap-3">
            {/* Icon */}
            <span className="text-2xl">
              {channelIcons[channel.type] || '📡'}
            </span>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium">{channel.name}</span>
                {channel.connected ? (
                  <Wifi className="w-4 h-4 text-green-500" />
                ) : (
                  <WifiOff className="w-4 h-4 text-mc-accent-red" />
                )}
              </div>
              {channel.botUsername && (
                <p className="text-xs text-mc-text-secondary">
                  @{channel.botUsername}
                </p>
              )}
              {channel.error && (
                <p className="text-xs text-mc-accent-red truncate">
                  {channel.error}
                </p>
              )}
            </div>

            {/* Status badge */}
            <div className={`px-2 py-1 rounded text-xs font-medium ${
              channel.connected
                ? 'bg-green-500/20 text-green-400'
                : channel.configured
                  ? 'bg-mc-accent-yellow/20 text-mc-accent-yellow'
                  : 'bg-mc-bg-tertiary text-mc-text-secondary'
            }`}>
              {channel.connected ? 'Online' : channel.configured ? 'Offline' : 'Not configured'}
            </div>
          </div>

          {channel.lastProbeAt && (
            <p className="text-xs text-mc-text-secondary mt-2">
              Last checked {formatDistanceToNow(new Date(channel.lastProbeAt), { addSuffix: true })}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
