'use client';

import { PlusIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { SidebarCalendar } from '@/components/calendar/sidebar-calendar';
import { CalendarList } from '@/components/calendar/calendar-list';
import { useCalendarStore } from '@/lib/stores/calendarStore';

export function CalendarSidebar() {
  const t = useTranslations('calendar');
  const { openEntryModal } = useCalendarStore();

  const handleNewEntry = () => {
    openEntryModal();
  };

  return (
    <aside className="hidden w-64 flex-col items-center gap-4 overflow-x-hidden overflow-y-auto border-r p-4 md:flex">
      <Button onClick={handleNewEntry} className="w-full self-stretch">
        <PlusIcon className="mr-2 size-4" />
        {t('newEntry')}
      </Button>
      <SidebarCalendar />
      <CalendarList />
    </aside>
  );
}
