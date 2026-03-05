'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon } from 'lucide-react';
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
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  return (
    <div className="flex h-svh flex-col overflow-hidden">
      <header className="flex items-center gap-3 border-b px-4 py-4 md:px-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/')}
          aria-label="Back to calendar"
        >
          <ArrowLeftIcon className="size-5" />
        </Button>
        <h1 className="text-2xl font-bold">Settings</h1>
      </header>

      <div className="flex min-h-0 flex-1">
        <SettingsSidebar activeTab={activeTab} onTabChange={setActiveTab} />

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
