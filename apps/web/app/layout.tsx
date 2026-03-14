import type { Metadata, Viewport } from 'next';
import { cookies, headers } from 'next/headers';
import { Geist, Geist_Mono } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';
import { ConnectionGuard } from '@/components/ConnectionGuard';
import { ThemeProvider } from '@/components/ThemeProvider';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: 'b-cal',
  description: 'Calendar App',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Reading x-nonce forces dynamic rendering so each request gets a fresh CSP nonce
  const headersList = await headers();
  const nonce = headersList.get('x-nonce') ?? undefined;

  const cookieStore = await cookies();
  const themeCookie = cookieStore.get('theme')?.value;

  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        {themeCookie && (
          <script
            nonce={nonce}
            suppressHydrationWarning
            dangerouslySetInnerHTML={{
              __html: `try{if(!localStorage.getItem("theme"))localStorage.setItem("theme",${JSON.stringify(themeCookie)})}catch(e){}`,
            }}
          />
        )}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider nonce={nonce}>
          <NextIntlClientProvider locale={locale} messages={messages}>
            {children}
            <ConnectionGuard />
            <Toaster />
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
