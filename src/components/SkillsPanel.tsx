'use client';

import { useState, useEffect } from 'react';
import { Puzzle, RefreshCw, Check, AlertCircle, ExternalLink } from 'lucide-react';

interface SkillInfo {
  name: string;
  description?: string;
  location: string;
  enabled: boolean;
}

interface SkillsResponse {
  skills?: SkillInfo[];
  count?: number;
}

export function SkillsPanel() {
  const [skills, setSkills] = useState<SkillInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSkills = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/openclaw/skills');
      if (!res.ok) {
        throw new Error('Failed to fetch skills');
      }
      const data: SkillsResponse = await res.json();
      setSkills(data.skills || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSkills();
  }, []);

  if (loading && skills.length === 0) {
    return (
      <div className="p-8 flex items-center justify-center">
        <RefreshCw className="w-5 h-5 animate-spin text-mc-text-secondary" />
        <span className="ml-2 text-mc-text-secondary">Loading skills...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="w-8 h-8 text-mc-accent-red mx-auto mb-2" />
        <p className="text-mc-accent-red">{error}</p>
        <button
          onClick={fetchSkills}
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
          <Puzzle className="w-5 h-5 text-mc-accent" />
          <h3 className="text-lg font-semibold">Installed Skills</h3>
          <span className="text-sm text-mc-text-secondary">({skills.length})</span>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="https://clawhub.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm text-mc-accent hover:underline"
          >
            Find more on ClawHub
            <ExternalLink className="w-3 h-3" />
          </a>
          <button
            onClick={fetchSkills}
            disabled={loading}
            className="p-2 hover:bg-mc-bg-tertiary rounded"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 text-mc-text-secondary ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {skills.length === 0 ? (
        <div className="text-center py-8 text-mc-text-secondary">
          <Puzzle className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No skills installed</p>
          <p className="text-sm mt-1">
            Install skills using <code className="bg-mc-bg px-2 py-1 rounded">clawhub install</code>
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {skills.map((skill) => (
            <div
              key={skill.name}
              className="p-3 bg-mc-bg rounded-lg border border-mc-border"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 bg-mc-bg-tertiary rounded">
                  <Puzzle className="w-4 h-4 text-mc-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{skill.name}</span>
                    {skill.enabled && (
                      <Check className="w-4 h-4 text-green-500" />
                    )}
                  </div>
                  {skill.description && (
                    <p className="text-sm text-mc-text-secondary mt-1 line-clamp-2">
                      {skill.description}
                    </p>
                  )}
                  <p className="text-xs text-mc-text-secondary mt-2 font-mono truncate">
                    {skill.location}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
