'use client';

import Link from 'next/link';
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

export const settingsTabKeys = [
  { key: 'profile', icon: UserIcon },
  { key: 'security', icon: ShieldIcon },
  { key: 'appearance', icon: PaletteIcon },
  { key: 'localization', icon: GlobeIcon },
] as const;

export type SettingsTab = (typeof settingsTabKeys)[number]['key'];

interface SettingsSidebarProps {
  activeTab: SettingsTab;
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
}

export function SettingsSidebar({
  activeTab,
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
          'fixed inset-y-0 left-0 z-30 flex w-64 max-w-[85vw] flex-col gap-0.5 border-r bg-background p-2 transition-transform duration-200 md:hidden',
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
            variant="ghost"
            className={cn(
              'justify-start border-l-2 border-transparent rounded-l-none',
              activeTab === tab.key &&
                'border-primary bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary',
            )}
            asChild
            onClick={() => onMobileOpenChange(false)}
          >
            <Link href={`/settings?tab=${tab.key}`}>
              <tab.icon className="mr-2 size-4" />
              {t(`tabs.${tab.key}`)}
            </Link>
          </Button>
        ))}
      </nav>

      {/* Desktop sidebar */}
      <nav className="hidden w-56 flex-col gap-0.5 border-r p-2 md:flex">
        {settingsTabKeys.map((tab) => (
          <Button
            key={tab.key}
            variant="ghost"
            className={cn(
              'justify-start border-l-2 border-transparent rounded-l-none',
              activeTab === tab.key &&
                'border-primary bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary',
            )}
            asChild
          >
            <Link href={`/settings?tab=${tab.key}`}>
              <tab.icon className="mr-2 size-4" />
              {t(`tabs.${tab.key}`)}
            </Link>
          </Button>
        ))}
      </nav>
    </>
  );
}
