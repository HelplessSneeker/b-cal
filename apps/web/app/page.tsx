'use client';

import { useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { AppShell } from '@/components/app-shell';
import { CalendarHeader } from '@/components/calendar/calendar-header';
import { CalendarSidebar } from '@/components/calendar/calendar-sidebar';
import { SwipeContainer } from '@/components/calendar/swipe-container';
import { DayView } from '@/components/calendar/views/day-view';
import { WeekView } from '@/components/calendar/views/week-view';
import { MonthView } from '@/components/calendar/views/month-view';
import { CalendarView, useCalendarStore } from '@/lib/stores/calendarStore';
import { useLocale } from '@/lib/hooks/useLocale';
import { EntryModal } from '@/components/entry-modal';
import { useCalendarData } from '@/lib/hooks/useCalendarData';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Button } from '@/components/ui/button';
import { PlusIcon } from 'lucide-react';

function CalendarPage() {
  const t = useTranslations('calendar');
  const view = useCalendarStore((s) => s.view);
  const currentDate = useCalendarStore((s) => s.currentDate);
  const isFetching = useCalendarStore((s) => s.isFetching);
  const openEntryModal = useCalendarStore((s) => s.openEntryModal);
  const { language } = useLocale();

  useCalendarData();

  const announcement = useMemo(() => {
    const dateStr = currentDate.toLocaleDateString(language, {
      month: 'long',
      year: 'numeric',
    });
    return t('viewAnnouncement', {
      date: `${dateStr}, ${t(`views.${view.toLowerCase()}`)}`,
    });
  }, [currentDate, language, view, t]);

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
        <div
          className="min-w-0 flex-1 overflow-hidden"
          role="region"
          aria-label={t('title')}
        >
          <SwipeContainer renderView={renderView} />
        </div>
      </div>
      <div
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {announcement}
      </div>
      <EntryModal />
      <Button
        className="fixed bottom-20 right-6 z-40 size-14 rounded-full shadow-lg md:hidden"
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
