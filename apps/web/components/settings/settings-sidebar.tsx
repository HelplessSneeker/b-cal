'use client';

import {
  GlobeIcon,
  PaletteIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  ShieldIcon,
  UserIcon,
  XIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/utils';

export const settingsTabs = [
  { key: 'profile', label: 'Profile', icon: UserIcon },
  { key: 'security', label: 'Security', icon: ShieldIcon },
  { key: 'appearance', label: 'Appearance', icon: PaletteIcon },
  { key: 'localization', label: 'Localization', icon: GlobeIcon },
] as const;

export type SettingsTab = (typeof settingsTabs)[number]['key'];

interface SettingsSidebarProps {
  activeTab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
}

export function SettingsSidebar({
  activeTab,
  onTabChange,
  collapsed,
  onCollapsedChange,
  mobileOpen,
  onMobileOpenChange,
}: SettingsSidebarProps) {
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
          aria-label="Close sidebar"
        >
          <XIcon className="size-4" />
        </Button>
        {settingsTabs.map((tab) => (
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
            {tab.label}
          </Button>
        ))}
      </nav>

      {/* Desktop sidebar */}
      <nav
        className={cn(
          'hidden flex-col gap-1 border-r p-2 transition-[width] duration-200 md:flex',
          collapsed ? 'w-14' : 'w-56',
        )}
      >
        <Button
          variant="ghost"
          size="icon"
          className="mb-1 self-end"
          onClick={() => onCollapsedChange(!collapsed)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <PanelLeftOpenIcon className="size-4" />
          ) : (
            <PanelLeftCloseIcon className="size-4" />
          )}
        </Button>
        {settingsTabs.map((tab) => (
          <Button
            key={tab.key}
            variant={activeTab === tab.key ? 'secondary' : 'ghost'}
            className={cn('justify-start', collapsed && 'justify-center px-0')}
            onClick={() => onTabChange(tab.key)}
            title={collapsed ? tab.label : undefined}
          >
            <tab.icon className={cn('size-4', !collapsed && 'mr-2')} />
            {!collapsed && tab.label}
          </Button>
        ))}
      </nav>
    </>
  );
}
