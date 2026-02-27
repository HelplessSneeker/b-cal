'use client';

import { useCallback } from 'react';
import { AuthProvider } from '@/components/AuthProvider';
import { CalendarHeader } from '@/components/calendar/calendar-header';
import { CalendarSidebar } from '@/components/calendar/calendar-sidebar';
import { SwipeContainer } from '@/components/calendar/swipe-container';
import { DayView } from '@/components/calendar/views/day-view';
import { WeekView } from '@/components/calendar/views/week-view';
import { MonthView } from '@/components/calendar/views/month-view';
import { CalendarView, useCalendarStore } from '@/lib/stores/calendarStore';
import { EntryModal } from '@/components/entry-modal';
import { useCalendarData } from '@/lib/hooks/useCalendarData';
import { Button } from '@/components/ui/button';
import { PlusIcon } from 'lucide-react';

function CalendarPage() {
  const view = useCalendarStore((s) => s.view);
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
    <div className="flex h-screen flex-col">
      <CalendarHeader />
      <div className="flex flex-1 overflow-hidden">
        <CalendarSidebar />
        <main className="flex-1">
          <SwipeContainer renderView={renderView} />
        </main>
      </div>
      <EntryModal />
      <Button
        className="fixed bottom-6 right-6 z-40 size-14 rounded-full shadow-lg md:hidden"
        onClick={() => openEntryModal()}
        aria-label="New entry"
      >
        <PlusIcon className="size-6" />
      </Button>
    </div>
  );
}

export default function Home() {
  return (
    <AuthProvider>
      <CalendarPage />
    </AuthProvider>
  );
}
