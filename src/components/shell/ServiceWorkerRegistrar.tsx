'use client';

import { useEffect } from 'react';

export const ServiceWorkerRegistrar: React.FC = () => {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const isDev = process.env.NODE_ENV !== 'production';

    if (isDev) {
      // Never let a stale SW serve old chunks during development: it causes
      // hydration mismatches because Next.js dev chunk paths are not hashed.
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => Promise.all(registrations.map((r) => r.unregister())))
        .catch(() => {});
      if (typeof caches !== 'undefined') {
        caches
          .keys()
          .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
          .catch(() => {});
      }
      return;
    }

    const register = () => {
      navigator.serviceWorker.register('/sw.js').then(
        (registration) => {
          console.log('[PWA] ServiceWorker registration successful with scope: ', registration.scope);
        },
        (err) => {
          console.log('[PWA] ServiceWorker registration failed: ', err);
        }
      );
    };

    if (document.readyState === 'complete') {
      register();
    } else {
      window.addEventListener('load', register, { once: true });
    }
  }, []);

  return null;
};
