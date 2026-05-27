'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { MenuIcon } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import {
  SettingsSidebar,
  type SettingsTab,
  settingsTabKeys,
} from '@/components/settings/settings-sidebar';
import { ProfileTab } from '@/components/settings/profile-tab';
import { LocalizationTab } from '@/components/settings/localization-tab';
import { SecurityTab } from '@/components/settings/security-tab';
import { AppearanceTab } from '@/components/settings/appearance-tab';

const validTabs = settingsTabKeys.map((t) => t.key);

function SettingsContent() {
  const t = useTranslations('settings');
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const activeTab: SettingsTab = validTabs.includes(tabParam as SettingsTab)
    ? (tabParam as SettingsTab)
    : 'profile';
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="flex items-center gap-3 border-b px-4 py-4 md:px-6">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setMobileOpen(true)}
          aria-label={t('nav.openSidebar')}
        >
          <MenuIcon className="size-5" />
        </Button>
        <h1 className="text-display-md">{t('title')}</h1>
      </header>

      <div className="flex min-h-0 flex-1">
        <SettingsSidebar
          activeTab={activeTab}
          mobileOpen={mobileOpen}
          onMobileOpenChange={setMobileOpen}
        />

        <main className="flex-1 overflow-auto p-6">
          {activeTab === 'profile' && <ProfileTab />}
          {activeTab === 'security' && <SecurityTab />}
          {activeTab === 'appearance' && <AppearanceTab />}
          {activeTab === 'localization' && <LocalizationTab />}
        </main>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <AppShell>
      <SettingsContent />
    </AppShell>
  );
}
