import { useTranslations } from 'next-intl';

export function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations('auth');

  return (
    <div className="flex min-h-svh w-full">
      {/* Brand panel — desktop only */}
      <div className="bg-primary text-primary-foreground dark:bg-card dark:text-card-foreground hidden flex-col justify-center px-10 md:flex md:w-2/5">
        <div className="max-w-xs">
          <h1 className="text-5xl font-bold tracking-tight">b-cal</h1>
          <p className="mt-3 text-lg opacity-80">{t('brand.tagline')}</p>
        </div>
      </div>

      {/* Form area */}
      <div className="flex flex-1 flex-col items-center justify-center p-6 md:p-10">
        {/* Brand header — mobile only */}
        <div className="mb-8 w-full max-w-sm md:hidden">
          <h1 className="text-2xl font-bold tracking-tight">b-cal</h1>
          <p className="text-sm text-muted-foreground">{t('brand.tagline')}</p>
        </div>

        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
