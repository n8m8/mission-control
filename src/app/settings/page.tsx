/**
 * Settings Page
 * Configure Mission Control and view OpenClaw status
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Settings, Save, RotateCcw, FolderOpen, Link as LinkIcon, Radio, Puzzle, BarChart3, MessageSquare } from 'lucide-react';
import { getConfig, updateConfig, resetConfig, type MissionControlConfig } from '@/lib/config';
import { ChannelsPanel } from '@/components/ChannelsPanel';
import { SkillsPanel } from '@/components/SkillsPanel';
import { UsagePanel } from '@/components/UsagePanel';
import { SessionsBrowser } from '@/components/SessionsBrowser';

type SettingsTab = 'general' | 'sessions' | 'channels' | 'skills' | 'usage';

export default function SettingsPage() {
  const router = useRouter();
  const [config, setConfig] = useState<MissionControlConfig | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  useEffect(() => {
    setConfig(getConfig());
  }, []);

  const handleSave = async () => {
    if (!config) return;

    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      updateConfig(config);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm('Reset all settings to defaults? This cannot be undone.')) {
      resetConfig();
      setConfig(getConfig());
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  const handleChange = (field: keyof MissionControlConfig, value: string) => {
    if (!config) return;
    setConfig({ ...config, [field]: value });
  };

  const tabs = [
    { id: 'general' as SettingsTab, label: 'General', icon: <Settings className="w-4 h-4" /> },
    { id: 'sessions' as SettingsTab, label: 'Sessions', icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'channels' as SettingsTab, label: 'Channels', icon: <Radio className="w-4 h-4" /> },
    { id: 'skills' as SettingsTab, label: 'Skills', icon: <Puzzle className="w-4 h-4" /> },
    { id: 'usage' as SettingsTab, label: 'Usage', icon: <BarChart3 className="w-4 h-4" /> },
  ];

  if (!config) {
    return (
      <div className="min-h-screen bg-mc-bg flex items-center justify-center">
        <div className="text-mc-text-secondary">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mc-bg">
      {/* Header */}
      <div className="border-b border-mc-border bg-mc-bg-secondary">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/')}
              className="p-2 hover:bg-mc-bg-tertiary rounded text-mc-text-secondary"
              title="Back to Mission Control"
            >
              ← Back
            </button>
            <Settings className="w-6 h-6 text-mc-accent" />
            <h1 className="text-2xl font-bold text-mc-text">Settings</h1>
          </div>

          {activeTab === 'general' && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleReset}
                className="px-4 py-2 border border-mc-border rounded hover:bg-mc-bg-tertiary text-mc-text-secondary flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 bg-mc-accent text-mc-bg rounded hover:bg-mc-accent/90 flex items-center gap-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex gap-1 -mb-px">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'text-mc-accent border-mc-accent'
                    : 'text-mc-text-secondary border-transparent hover:text-mc-text hover:border-mc-border'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Success Message */}
        {saveSuccess && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded text-green-400">
            ✓ Settings saved successfully
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded text-red-400">
            ✗ {error}
          </div>
        )}

        {/* General Tab */}
        {activeTab === 'general' && (
          <>
            {/* Workspace Paths */}
            <section className="mb-8 p-6 bg-mc-bg-secondary border border-mc-border rounded-lg">
              <div className="flex items-center gap-2 mb-4">
                <FolderOpen className="w-5 h-5 text-mc-accent" />
                <h2 className="text-xl font-semibold text-mc-text">Workspace Paths</h2>
              </div>
              <p className="text-sm text-mc-text-secondary mb-4">
                Configure where Mission Control stores projects and deliverables.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-mc-text mb-2">
                    Workspace Base Path
                  </label>
                  <input
                    type="text"
                    value={config.workspaceBasePath}
                    onChange={(e) => handleChange('workspaceBasePath', e.target.value)}
                    placeholder="~/Documents/Shared"
                    className="w-full px-4 py-2 bg-mc-bg border border-mc-border rounded text-mc-text focus:border-mc-accent focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-mc-text mb-2">
                    Projects Path
                  </label>
                  <input
                    type="text"
                    value={config.projectsPath}
                    onChange={(e) => handleChange('projectsPath', e.target.value)}
                    placeholder="~/Documents/Shared/projects"
                    className="w-full px-4 py-2 bg-mc-bg border border-mc-border rounded text-mc-text focus:border-mc-accent focus:outline-none"
                  />
                </div>
              </div>
            </section>

            {/* API Configuration */}
            <section className="mb-8 p-6 bg-mc-bg-secondary border border-mc-border rounded-lg">
              <div className="flex items-center gap-2 mb-4">
                <LinkIcon className="w-5 h-5 text-mc-accent" />
                <h2 className="text-xl font-semibold text-mc-text">API Configuration</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-mc-text mb-2">
                    Mission Control URL
                  </label>
                  <input
                    type="text"
                    value={config.missionControlUrl}
                    onChange={(e) => handleChange('missionControlUrl', e.target.value)}
                    placeholder="http://localhost:3000"
                    className="w-full px-4 py-2 bg-mc-bg border border-mc-border rounded text-mc-text focus:border-mc-accent focus:outline-none"
                  />
                </div>
              </div>
            </section>

            {/* Environment Variables Note */}
            <section className="p-6 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-400 mb-2">
                📝 Environment Variables
              </h3>
              <ul className="text-sm text-blue-300 space-y-1 ml-4 list-disc">
                <li><code>OPENCLAW_GATEWAY_URL</code> - Gateway WebSocket URL</li>
                <li><code>OPENCLAW_GATEWAY_TOKEN</code> - Gateway auth token</li>
                <li><code>WORKSPACE_BASE_PATH</code> - Base workspace directory</li>
              </ul>
            </section>
          </>
        )}

        {/* Sessions Tab */}
        {activeTab === 'sessions' && (
          <section className="bg-mc-bg-secondary border border-mc-border rounded-lg overflow-hidden">
            <SessionsBrowser />
          </section>
        )}

        {/* Channels Tab */}
        {activeTab === 'channels' && (
          <section className="bg-mc-bg-secondary border border-mc-border rounded-lg overflow-hidden">
            <ChannelsPanel />
          </section>
        )}

        {/* Skills Tab */}
        {activeTab === 'skills' && (
          <section className="bg-mc-bg-secondary border border-mc-border rounded-lg overflow-hidden">
            <SkillsPanel />
          </section>
        )}

        {/* Usage Tab */}
        {activeTab === 'usage' && (
          <section className="bg-mc-bg-secondary border border-mc-border rounded-lg overflow-hidden">
            <UsagePanel />
          </section>
        )}
      </div>
    </div>
  );
}
