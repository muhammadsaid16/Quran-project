import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Header } from '@/components/shell/Header';
import { RecitationHUD } from '@/components/hud/RecitationHUD';

export const metadata: Metadata = {
  title: 'Quran Cognitive OS — نظام تحفيظ القرآن المعرفي',
  description:
    'Local-First Quran Memorization & Retention Platform with Active Recall, Voice Assessment & FSRS',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/icons/icon-192x192.svg',
    apple: '/icons/icon-192x192.svg',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'QuranOS',
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
    <html lang="ar" dir="rtl">
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="icon" href="/icons/icon-192x192.svg" type="image/svg+xml" />
      </head>
      <body className="min-h-screen bg-mushaf-parchment dark:bg-darkMushaf-bg text-mushaf-ink dark:text-darkMushaf-ink selection:bg-mushaf-gold/30 selection:text-mushaf-ink pb-36">
        <Header />
        <main className="w-full">{children}</main>
        <RecitationHUD />

        {/* PWA Service Worker Registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(registration) {
                      console.log('[PWA] ServiceWorker registration successful with scope: ', registration.scope);
                    },
                    function(err) {
                      console.log('[PWA] ServiceWorker registration failed: ', err);
                    }
                  );
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
