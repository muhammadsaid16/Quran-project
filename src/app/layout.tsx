import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Header } from '@/components/shell/Header';
import { ServiceWorkerRegistrar } from '@/components/shell/ServiceWorkerRegistrar';

export const metadata: Metadata = {
  title: 'باب الإتقان — مصحف الحفظ والاسترجاع الذكي',
  description:
    'منصة حفظ واسترجاع وتثبيت القرآن الكريم بالاسترجاع النشط والتسميع الصوتي المباشر وخوارزمية FSRS',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/icons/icon-192x192.svg',
    apple: '/icons/icon-192x192.svg',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'باب الإتقان',
  },
};

export const viewport: Viewport = {
  themeColor: '#11654C',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="icon" href="/icons/icon-192x192.svg" type="image/svg+xml" />
        <link
          rel="preload"
          href="/fonts/AmiriQuran-Regular.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/UthmanicHafs1_Ver09.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/UthmanTN1_Ver10.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body
        className="min-h-screen bg-mushaf-parchment dark:bg-darkMushaf-bg text-mushaf-ink dark:text-darkMushaf-ink selection:bg-mushaf-gold/30 selection:text-mushaf-ink"
        suppressHydrationWarning
      >
        <Header />
        <main className="w-full">{children}</main>

        {/* PWA Service Worker Registration (production only) */}
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
