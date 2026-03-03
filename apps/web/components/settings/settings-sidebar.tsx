'use client';

import { GlobeIcon, PaletteIcon, ShieldIcon, UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const settingsTabs = [
  { key: 'profile', label: 'Profile', icon: UserIcon },
  { key: 'security', label: 'Security', icon: ShieldIcon },
  { key: 'appearance', label: 'Appearance', icon: PaletteIcon },
  { key: 'language', label: 'Language', icon: GlobeIcon },
] as const;

export type SettingsTab = (typeof settingsTabs)[number]['key'];

interface SettingsSidebarProps {
  activeTab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
}

export function SettingsSidebar({
  activeTab,
  onTabChange,
}: SettingsSidebarProps) {
  return (
    <nav className="flex w-56 flex-col gap-1 border-r p-4">
      {settingsTabs.map((tab) => (
        <Button
          key={tab.key}
          variant={activeTab === tab.key ? 'secondary' : 'ghost'}
          className="justify-start"
          onClick={() => onTabChange(tab.key)}
        >
          <tab.icon className="mr-2 size-4" />
          {tab.label}
        </Button>
      ))}
    </nav>
  );
}
