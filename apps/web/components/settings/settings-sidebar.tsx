'use client';

import {
  GlobeIcon,
  PaletteIcon,
  ShieldIcon,
  UserIcon,
  XIcon,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/utils';

const settingsTabKeys = [
  { key: 'profile', icon: UserIcon },
  { key: 'security', icon: ShieldIcon },
  { key: 'appearance', icon: PaletteIcon },
  { key: 'localization', icon: GlobeIcon },
] as const;

export type SettingsTab = (typeof settingsTabKeys)[number]['key'];

interface SettingsSidebarProps {
  activeTab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
}

export function SettingsSidebar({
  activeTab,
  onTabChange,
  mobileOpen,
  onMobileOpenChange,
}: SettingsSidebarProps) {
  const t = useTranslations('settings');

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 md:hidden"
          onClick={() => onMobileOpenChange(false)}
        />
      )}

      {/* Mobile sidebar */}
      <nav
        className={cn(
          'fixed inset-y-0 left-0 z-30 flex w-56 flex-col gap-1 border-r bg-background p-2 transition-transform duration-200 md:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <Button
          variant="ghost"
          size="icon"
          className="mb-1 self-end"
          onClick={() => onMobileOpenChange(false)}
          aria-label={t('nav.closeSidebar')}
        >
          <XIcon className="size-4" />
        </Button>
        {settingsTabKeys.map((tab) => (
          <Button
            key={tab.key}
            variant={activeTab === tab.key ? 'secondary' : 'ghost'}
            className="justify-start"
            onClick={() => {
              onTabChange(tab.key);
              onMobileOpenChange(false);
            }}
          >
            <tab.icon className="mr-2 size-4" />
            {t(`tabs.${tab.key}`)}
          </Button>
        ))}
      </nav>

      {/* Desktop sidebar */}
      <nav className="hidden w-56 flex-col gap-1 border-r p-2 md:flex">
        {settingsTabKeys.map((tab) => (
          <Button
            key={tab.key}
            variant={activeTab === tab.key ? 'secondary' : 'ghost'}
            className="justify-start"
            onClick={() => onTabChange(tab.key)}
          >
            <tab.icon className="mr-2 size-4" />
            {t(`tabs.${tab.key}`)}
          </Button>
        ))}
      </nav>
    </>
  );
}
