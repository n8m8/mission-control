'use client';

import { useState, useEffect } from 'react';
import { BarChart3, RefreshCw, AlertCircle, Coins, Clock, Zap } from 'lucide-react';

interface UsageData {
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  totalCost?: number;
  sessions: number;
  uptime?: string;
  uptimeMs?: number;
}

export function UsagePanel() {
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsage = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/openclaw/usage');
      if (!res.ok) {
        throw new Error('Failed to fetch usage');
      }
      const data = await res.json();
      setUsage(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsage();
    // Refresh every minute
    const interval = setInterval(fetchUsage, 60000);
    return () => clearInterval(interval);
  }, []);

  const formatNumber = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toString();
  };

  const formatUptime = (ms: number) => {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    return `${hours}h ${minutes}m`;
  };

  if (loading && !usage) {
    return (
      <div className="p-8 flex items-center justify-center">
        <RefreshCw className="w-5 h-5 animate-spin text-mc-text-secondary" />
        <span className="ml-2 text-mc-text-secondary">Loading usage data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="w-8 h-8 text-mc-accent-red mx-auto mb-2" />
        <p className="text-mc-accent-red">{error}</p>
        <button
          onClick={fetchUsage}
          className="mt-2 text-sm text-mc-accent hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!usage) return null;

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-mc-accent" />
          <h3 className="text-lg font-semibold">Usage Statistics</h3>
        </div>
        <button
          onClick={fetchUsage}
          disabled={loading}
          className="p-2 hover:bg-mc-bg-tertiary rounded"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 text-mc-text-secondary ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-mc-bg rounded-lg border border-mc-border">
          <div className="flex items-center gap-2 text-mc-text-secondary mb-1">
            <Zap className="w-4 h-4" />
            <span className="text-xs uppercase">Total Tokens</span>
          </div>
          <div className="text-2xl font-bold text-mc-accent">
            {formatNumber(usage.totalTokens)}
          </div>
        </div>

        <div className="p-4 bg-mc-bg rounded-lg border border-mc-border">
          <div className="flex items-center gap-2 text-mc-text-secondary mb-1">
            <BarChart3 className="w-4 h-4" />
            <span className="text-xs uppercase">Sessions</span>
          </div>
          <div className="text-2xl font-bold text-mc-accent-purple">
            {usage.sessions}
          </div>
        </div>

        {usage.totalCost !== undefined && (
          <div className="p-4 bg-mc-bg rounded-lg border border-mc-border">
            <div className="flex items-center gap-2 text-mc-text-secondary mb-1">
              <Coins className="w-4 h-4" />
              <span className="text-xs uppercase">Est. Cost</span>
            </div>
            <div className="text-2xl font-bold text-mc-accent-yellow">
              ${usage.totalCost.toFixed(2)}
            </div>
          </div>
        )}

        {usage.uptimeMs && (
          <div className="p-4 bg-mc-bg rounded-lg border border-mc-border">
            <div className="flex items-center gap-2 text-mc-text-secondary mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-xs uppercase">Uptime</span>
            </div>
            <div className="text-2xl font-bold text-green-400">
              {formatUptime(usage.uptimeMs)}
            </div>
          </div>
        )}
      </div>

      {/* Token Breakdown */}
      <div className="p-4 bg-mc-bg rounded-lg border border-mc-border">
        <h4 className="text-sm font-medium text-mc-text-secondary mb-3">Token Breakdown</h4>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Input Tokens</span>
              <span className="text-mc-text-secondary">{formatNumber(usage.inputTokens)}</span>
            </div>
            <div className="h-2 bg-mc-bg-tertiary rounded-full overflow-hidden">
              <div
                className="h-full bg-mc-accent rounded-full"
                style={{ width: `${(usage.inputTokens / usage.totalTokens) * 100}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Output Tokens</span>
              <span className="text-mc-text-secondary">{formatNumber(usage.outputTokens)}</span>
            </div>
            <div className="h-2 bg-mc-bg-tertiary rounded-full overflow-hidden">
              <div
                className="h-full bg-mc-accent-purple rounded-full"
                style={{ width: `${(usage.outputTokens / usage.totalTokens) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
