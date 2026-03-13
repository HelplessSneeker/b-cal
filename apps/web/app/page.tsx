'use client';

import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { AppShell } from '@/components/app-shell';
import { CalendarHeader } from '@/components/calendar/calendar-header';
import { CalendarSidebar } from '@/components/calendar/calendar-sidebar';
import { SwipeContainer } from '@/components/calendar/swipe-container';
import { DayView } from '@/components/calendar/views/day-view';
import { WeekView } from '@/components/calendar/views/week-view';
import { MonthView } from '@/components/calendar/views/month-view';
import { CalendarView, useCalendarStore } from '@/lib/stores/calendarStore';
import { EntryModal } from '@/components/entry-modal';
import { useCalendarData } from '@/lib/hooks/useCalendarData';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Button } from '@/components/ui/button';
import { PlusIcon } from 'lucide-react';

function CalendarPage() {
  const t = useTranslations('calendar');
  const view = useCalendarStore((s) => s.view);
  const isFetching = useCalendarStore((s) => s.isFetching);
  const openEntryModal = useCalendarStore((s) => s.openEntryModal);

  useCalendarData();

  const renderView = useCallback(
    (date: Date) => (
      <>
        {view === CalendarView.Day && <DayView date={date} />}
        {view === CalendarView.Week && <WeekView date={date} />}
        {view === CalendarView.Month && <MonthView date={date} />}
      </>
    ),
    [view],
  );

  return (
    <div className="flex h-full flex-col">
      <CalendarHeader />
      <ProgressBar active={isFetching} />
      <div className="flex flex-1 overflow-hidden">
        <CalendarSidebar />
        <div className="min-w-0 flex-1 overflow-hidden">
          <SwipeContainer renderView={renderView} />
        </div>
      </div>
      <EntryModal />
      <Button
        className="fixed bottom-20 right-6 z-40 size-14 rounded-full shadow-lg md:bottom-6 md:hidden"
        onClick={() => openEntryModal()}
        aria-label={t('newEntry')}
      >
        <PlusIcon className="size-6" />
      </Button>
    </div>
  );
}

export default function Home() {
  return (
    <AppShell>
      <CalendarPage />
    </AppShell>
  );
}
