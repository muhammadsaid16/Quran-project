'use client';

import { useEffect } from 'react';

export const ServiceWorkerRegistrar: React.FC = () => {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
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
