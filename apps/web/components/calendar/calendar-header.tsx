'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { TranslateFn } from '@b-cal/i18n/config';
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MenuIcon,
} from 'lucide-react';
import { useCalendarStore, CalendarView } from '@/lib/stores/calendarStore';
import { useLocale } from '@/lib/hooks/useLocale';
import { getWeekNumber } from '@/lib/calendar/date-utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { SidebarCalendar } from '@/components/calendar/sidebar-calendar';

function formatDateDisplay(
  date: Date,
  view: CalendarView,
  locale: string,
  t: TranslateFn,
): string {
  switch (view) {
    case CalendarView.Day:
      return date.toLocaleDateString(locale, {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    case CalendarView.Week:
      return t('calendarWeekShort', { week: getWeekNumber(date) });
    case CalendarView.Month:
      return date.toLocaleDateString(locale, {
        month: 'long',
        year: 'numeric',
      });
  }
}

function formatDateDisplayShort(
  date: Date,
  view: CalendarView,
  locale: string,
  t: TranslateFn,
): string {
  switch (view) {
    case CalendarView.Day:
      return date.toLocaleDateString(locale, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    case CalendarView.Week:
      return t('calendarWeekShort', { week: getWeekNumber(date) });
    case CalendarView.Month:
      return date.toLocaleDateString(locale, {
        month: 'short',
        year: 'numeric',
      });
  }
}

export function CalendarHeader() {
  const t = useTranslations('calendar');
  const { language } = useLocale();
  const { view, currentDate, setView, setCurrentDate, navigate } =
    useCalendarStore();

  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleTodayClick = () => {
    setCurrentDate(new Date());
  };

  const handleViewChange = (newView: CalendarView) => {
    setView(newView);
  };

  return (
    <>
      {/* Desktop header */}
      <header
        className="hidden items-center justify-between border-b py-4 pr-6 md:flex"
        data-testid="desktop-header"
      >
        <div className="flex w-64 items-center justify-between pl-4">
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <Button variant="outline" size="sm" onClick={handleTodayClick}>
            {t('today')}
          </Button>
        </div>

        <div className="flex flex-1 items-center justify-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            aria-label={t('nav.previous')}
          >
            <ChevronLeftIcon className="size-4" />
          </Button>
          <span className="min-w-48 text-center text-muted-foreground">
            {formatDateDisplay(currentDate, view, language, t)}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(1)}
            aria-label={t('nav.next')}
          >
            <ChevronRightIcon className="size-4" />
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                {t(`views.${view.toLowerCase()}`)}
                <ChevronDownIcon className="ml-1 size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => handleViewChange(CalendarView.Day)}
              >
                {t('views.day')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleViewChange(CalendarView.Week)}
              >
                {t('views.week')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleViewChange(CalendarView.Month)}
              >
                {t('views.month')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Mobile header */}
      <header
        className="flex items-center justify-between border-b px-3 py-2 md:hidden"
        data-testid="mobile-header"
      >
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDrawerOpen(true)}
            aria-label={t('nav.openMenu')}
          >
            <MenuIcon className="size-5" />
          </Button>
          <Button
            variant="outline"
            size="xs"
            onClick={handleTodayClick}
            aria-label={t('nav.goToToday')}
          >
            {t('today')}
          </Button>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => navigate(-1)}
            aria-label={t('nav.previous')}
          >
            <ChevronLeftIcon className="size-4" />
          </Button>
          <span className="text-muted-foreground text-sm font-medium">
            {formatDateDisplayShort(currentDate, view, language, t)}
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => navigate(1)}
            aria-label={t('nav.next')}
          >
            <ChevronRightIcon className="size-4" />
          </Button>
        </div>

        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="xs">
                {t(`views.${view.toLowerCase()}`)}
                <ChevronDownIcon className="ml-0.5 size-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => handleViewChange(CalendarView.Day)}
              >
                {t('views.day')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleViewChange(CalendarView.Week)}
              >
                {t('views.week')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleViewChange(CalendarView.Month)}
              >
                {t('views.month')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Mobile drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="left" className="w-72" aria-describedby={undefined}>
          <SheetHeader>
            <SheetTitle>{t('title')}</SheetTitle>
          </SheetHeader>
          <div className="flex flex-1 flex-col overflow-y-auto px-4">
            <SidebarCalendar />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
