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
  // Early (pre-hydration) cleanup of stale service-worker artifacts.
  // In dev, a stale SW can serve old HTML with old text and cause hydration
  // mismatches. This runs during HTML parsing, before the app bundle, so the
  // very first load already starts from clean caches (one guarded reload).
  const swCleanupScript = `
(function () {
  try {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    var KEEP = 'quran-cognitive-os-v3';
    var UNREGISTER_ALL = false;
    var hadStale = false;
    var finish = function () {
      if (!hadStale) return;
      try {
        if (!sessionStorage.getItem('qos-sw-cleared')) {
          sessionStorage.setItem('qos-sw-cleared', '1');
          location.reload();
        }
      } catch (e) {}
    };
    navigator.serviceWorker.getRegistrations().then(function (regs) {
      var jobs = [];
      regs.forEach(function (r) {
        if (UNREGISTER_ALL) { hadStale = true; jobs.push(r.unregister()); }
      });
      return Promise.all(jobs);
    }).catch(function () {}).then(function () {
      if (typeof caches === 'undefined') return finish();
      caches.keys().then(function (keys) {
        var jobs = [];
        keys.forEach(function (k) {
          if (k !== KEEP) { hadStale = true; jobs.push(caches.delete(k)); }
        });
        Promise.all(jobs).then(finish).catch(finish);
      }).catch(finish);
    });
  } catch (e) {}
})();`;

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
        <script dangerouslySetInnerHTML={{ __html: swCleanupScript }} />
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
