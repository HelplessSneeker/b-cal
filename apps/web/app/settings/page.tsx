'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowLeftIcon, MenuIcon } from 'lucide-react';
import { AuthProvider } from '@/components/AuthProvider';
import { Button } from '@/components/ui/button';
import {
  SettingsSidebar,
  type SettingsTab,
} from '@/components/settings/settings-sidebar';
import { ProfileTab } from '@/components/settings/profile-tab';
import { LocalizationTab } from '@/components/settings/localization-tab';
import { SecurityTab } from '@/components/settings/security-tab';
import { AppearanceTab } from '@/components/settings/appearance-tab';

function SettingsContent() {
  const t = useTranslations('settings');
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-svh flex-col overflow-hidden">
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
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/')}
          aria-label={t('nav.backToCalendar')}
        >
          <ArrowLeftIcon className="size-5" />
        </Button>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
      </header>

      <div className="flex min-h-0 flex-1">
        <SettingsSidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          collapsed={sidebarCollapsed}
          onCollapsedChange={setSidebarCollapsed}
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
    <AuthProvider>
      <SettingsContent />
    </AuthProvider>
  );
}
