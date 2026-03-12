'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { CalendarDaysIcon, LogOutIcon, SettingsIcon } from 'lucide-react';
import { AuthProvider } from '@/components/AuthProvider';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useUserStore } from '@/lib/stores/userStore';
import { useCalendarStore } from '@/lib/stores/calendarStore';
import { logout } from '@/lib/api/auth';
import { cn } from '@/lib/utils/utils';

const navItems = [
  { path: '/', icon: CalendarDaysIcon, labelKey: 'calendar' as const },
  { path: '/settings', icon: SettingsIcon, labelKey: 'settings' as const },
];

function getAvatarInitials(email: string): string {
  const [localPart, domain] = email.split('@');
  const localInitial = localPart?.[0]?.toUpperCase() ?? '';
  const domainInitial = domain?.[0]?.toUpperCase() ?? '';
  return `${localInitial}${domainInitial}`;
}

function AppShellContent({ children }: { children: React.ReactNode }) {
  const t = useTranslations('common');
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearUser } = useUserStore();
  const clearCache = useCalendarStore((s) => s.clearCache);

  const handleLogout = async () => {
    await logout();
    clearUser();
    clearCache();
    router.push('/login');
  };

  const initials = user?.email ? getAvatarInitials(user.email) : '?';

  return (
    <div className="flex h-svh flex-col md:flex-row">
      {/* Desktop icon rail */}
      <nav className="hidden w-14 shrink-0 flex-col items-center border-r bg-background py-2 md:flex">
        <div className="flex flex-1 flex-col items-center gap-1">
          {navItems.map((item) => (
            <Tooltip key={item.path}>
              <TooltipTrigger asChild>
                <Button
                  variant={pathname === item.path ? 'secondary' : 'ghost'}
                  size="icon"
                  onClick={() => router.push(item.path)}
                  aria-label={t(`nav.${item.labelKey}`)}
                  aria-current={pathname === item.path ? 'page' : undefined}
                >
                  <item.icon className="size-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                {t(`nav.${item.labelKey}`)}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>

        <div className="flex flex-col items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                aria-label={user?.email ?? ''}
              >
                <Avatar className="size-8">
                  <AvatarFallback className="text-xs">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="end">
              <DropdownMenuLabel>{user?.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOutIcon className="mr-2 size-4" />
                {t('nav.logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>

      {/* Main content */}
      <main className="min-w-0 flex-1 pb-14 md:pb-0">{children}</main>

      {/* Mobile bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t bg-background md:hidden">
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              className={cn(
                'flex flex-1 flex-col items-center gap-0.5 py-2 text-xs transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground',
              )}
              aria-label={t(`nav.${item.labelKey}`)}
              aria-current={isActive ? 'page' : undefined}
            >
              <item.icon className={cn('size-5', isActive && 'stroke-[2.5]')} />
              <span>{t(`nav.${item.labelKey}`)}</span>
            </button>
          );
        })}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex flex-1 flex-col items-center gap-0.5 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
              aria-label={user?.email ?? ''}
            >
              <Avatar className="size-5">
                <AvatarFallback className="text-[10px]">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span>{t('nav.account')}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top">
            <DropdownMenuLabel>{user?.email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOutIcon className="mr-2 size-4" />
              {t('nav.logout')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </nav>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <TooltipProvider>
        <AppShellContent>{children}</AppShellContent>
      </TooltipProvider>
    </AuthProvider>
  );
}
