'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  LogOutIcon,
  MenuIcon,
  PlusIcon,
  Trash2Icon,
} from 'lucide-react';
import { logout, deleteUser } from '@/lib/api/auth';
import { useUserStore } from '@/lib/stores/userStore';
import { useCalendarStore, CalendarView } from '@/lib/stores/calendarStore';
import { getWeekNumber } from '@/lib/calendar/date-utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldLabel } from '@/components/ui/field';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { SidebarCalendar } from '@/components/calendar/sidebar-calendar';
import { Separator } from '@/components/ui/separator';

function getAvatarInitials(email: string): string {
  const [localPart, domain] = email.split('@');
  const localInitial = localPart?.[0]?.toUpperCase() ?? '';
  const domainInitial = domain?.[0]?.toUpperCase() ?? '';
  return `${localInitial}${domainInitial}`;
}

function formatDateDisplay(date: Date, view: CalendarView): string {
  switch (view) {
    case CalendarView.Day:
      // todo change based on localization
      return date.toLocaleDateString('at-DE', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    case CalendarView.Week:
      return `CW ${getWeekNumber(date)}`;
    case CalendarView.Month:
      // todo change based on localization
      return date.toLocaleDateString('at-DE', {
        month: 'long',
        year: 'numeric',
      });
  }
}

function formatDateDisplayShort(date: Date, view: CalendarView): string {
  switch (view) {
    case CalendarView.Day:
      return date.toLocaleDateString('at-DE', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    case CalendarView.Week:
      return `CW ${getWeekNumber(date)}`;
    case CalendarView.Month:
      return date.toLocaleDateString('at-DE', {
        month: 'short',
        year: 'numeric',
      });
  }
}

export function CalendarHeader() {
  const router = useRouter();
  const { user, clearUser } = useUserStore();
  const {
    view,
    currentDate,
    setView,
    setCurrentDate,
    clearCache,
    navigate,
    openEntryModal,
  } = useCalendarStore();
  const initials = user?.email ? getAvatarInitials(user.email) : '?';

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleTodayClick = () => {
    setCurrentDate(new Date());
  };

  const handleViewChange = (newView: CalendarView) => {
    setView(newView);
  };

  const handleLogout = async () => {
    setDrawerOpen(false);
    await logout();
    clearUser();
    clearCache();
    router.push('/login');
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    const result = await deleteUser();
    if (result.success) {
      clearUser();
      clearCache();
      router.push('/login');
    }
    setIsDeleting(false);
  };

  return (
    <>
      {/* Desktop header */}
      <header
        className="hidden items-center justify-between border-b py-4 pr-6 md:flex"
        data-testid="desktop-header"
      >
        <div className="flex w-64 items-center justify-between pl-4">
          <h1 className="text-2xl font-bold">Calendar</h1>
          <Button variant="outline" size="sm" onClick={handleTodayClick}>
            Today
          </Button>
        </div>

        <div className="flex flex-1 items-center justify-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeftIcon className="size-4" />
          </Button>
          <span className="min-w-48 text-center text-muted-foreground">
            {formatDateDisplay(currentDate, view)}
          </span>
          <Button variant="ghost" size="icon" onClick={() => navigate(1)}>
            <ChevronRightIcon className="size-4" />
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                {view}
                <ChevronDownIcon className="ml-1 size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => handleViewChange(CalendarView.Day)}
              >
                Day
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleViewChange(CalendarView.Week)}
              >
                Week
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleViewChange(CalendarView.Month)}
              >
                Month
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar>
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{user?.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>Logout</DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setDeleteDialogOpen(true)}
              >
                Delete Account
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
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
        >
          <MenuIcon className="size-5" />
        </Button>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => navigate(-1)}
            aria-label="Previous"
          >
            <ChevronLeftIcon className="size-4" />
          </Button>
          <button
            onClick={handleTodayClick}
            className="text-muted-foreground text-sm font-medium"
            aria-label="Go to today"
          >
            {formatDateDisplayShort(currentDate, view)}
          </button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => navigate(1)}
            aria-label="Next"
          >
            <ChevronRightIcon className="size-4" />
          </Button>
        </div>

        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="xs">
                {view}
                <ChevronDownIcon className="ml-0.5 size-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => handleViewChange(CalendarView.Day)}
              >
                Day
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleViewChange(CalendarView.Week)}
              >
                Week
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleViewChange(CalendarView.Month)}
              >
                Month
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => openEntryModal()}
            aria-label="New entry"
          >
            <PlusIcon className="size-4" />
          </Button>
        </div>
      </header>

      {/* Mobile drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="left" className="w-72" aria-describedby={undefined}>
          <SheetHeader>
            <SheetTitle>Calendar</SheetTitle>
          </SheetHeader>
          <div className="flex flex-1 flex-col overflow-y-auto px-4">
            <SidebarCalendar />
            <Separator className="my-4" />
            <div className="flex flex-col gap-2">
              <p className="text-muted-foreground truncate text-sm">
                {user?.email}
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="justify-start"
                onClick={handleLogout}
              >
                <LogOutIcon className="mr-2 size-4" />
                Logout
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive justify-start"
                onClick={() => {
                  setDrawerOpen(false);
                  setDeleteDialogOpen(true);
                }}
              >
                <Trash2Icon className="mr-2 size-4" />
                Delete Account
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) setConfirmEmail('');
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Account</DialogTitle>
            <DialogDescription>
              This action is permanent and cannot be undone. All your data will
              be deleted. Type your email address to confirm.
            </DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel>Email</FieldLabel>
            <Input
              placeholder={user?.email}
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
            />
          </Field>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={confirmEmail !== user?.email || isDeleting}
              onClick={handleDelete}
            >
              {isDeleting ? 'Deleting...' : 'Delete Account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
