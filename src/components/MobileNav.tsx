'use client';

import { Users, LayoutList, Activity } from 'lucide-react';

export type MobileTab = 'agents' | 'tasks' | 'feed';

interface MobileNavProps {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
}

export function MobileNav({ activeTab, onTabChange }: MobileNavProps) {
  const tabs: { id: MobileTab; label: string; icon: React.ReactNode }[] = [
    { id: 'agents', label: 'Agents', icon: <Users className="w-5 h-5" /> },
    { id: 'tasks', label: 'Tasks', icon: <LayoutList className="w-5 h-5" /> },
    { id: 'feed', label: 'Feed', icon: <Activity className="w-5 h-5" /> },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-mc-bg-secondary border-t border-mc-border z-50">
      <div className="flex">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex-1 flex flex-col items-center gap-1 py-3 px-2 transition-colors ${
              activeTab === tab.id
                ? 'text-mc-accent bg-mc-accent/10'
                : 'text-mc-text-secondary hover:text-mc-text'
            }`}
          >
            {tab.icon}
            <span className="text-xs font-medium">{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
