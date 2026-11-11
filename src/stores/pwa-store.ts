import { create } from 'zustand';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

import {
  DownloadProgress,
  isOfflinePackageCached,
  downloadAndCacheOfflinePackage,
  clearOfflinePackage,
} from '@/lib/offline-installer';

export interface PWAState {
  isOnline: boolean;
  isInstallable: boolean;
  isInstalled: boolean;
  isStoragePersisted: boolean;
  storageEstimate: { usageMB: number; quotaMB: number } | null;
  deferredPrompt: BeforeInstallPromptEvent | null;

  // Offline Package Installation State
  isInstallModalOpen: boolean;
  isOfflinePackageInstalled: boolean;
  downloadStatus: 'idle' | 'downloading' | 'completed' | 'error';
  downloadProgress: DownloadProgress | null;
  downloadError: string | null;

  // Actions
  setIsOnline: (online: boolean) => void;
  setInstallModalOpen: (open: boolean) => void;
  initPWA: () => void;
  promptInstall: () => Promise<boolean>;
  requestPersistentStorage: () => Promise<boolean>;
  checkOfflinePackageInstalled: () => Promise<boolean>;
  startOfflineDownload: () => Promise<boolean>;
  deleteOfflinePackage: () => Promise<void>;
}

export const usePWAStore = create<PWAState>((set, get) => ({
  isOnline: true,
  isInstallable: false,
  isInstalled: false,
  isStoragePersisted: false,
  storageEstimate: null,
  deferredPrompt: null,

  isInstallModalOpen: false,
  isOfflinePackageInstalled: false,
  downloadStatus: 'idle',
  downloadProgress: null,
  downloadError: null,

  setIsOnline: (isOnline) => set({ isOnline }),
  setInstallModalOpen: (isInstallModalOpen) => set({ isInstallModalOpen }),

  initPWA: () => {
    if (typeof window === 'undefined') return;

    // Check if offline package is already cached
    get().checkOfflinePackageInstalled();

    // Initialize actual client online status after mount
    if (typeof navigator !== 'undefined') {
      set({ isOnline: navigator.onLine });
    }

    // 1. Online / Offline listeners
    const handleOnline = () => set({ isOnline: true });
    const handleOffline = () => set({ isOnline: false });
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 2. Persistent Storage verification & auto-request
    if (navigator.storage && navigator.storage.persisted) {
      navigator.storage.persisted().then((persisted) => {
        set({ isStoragePersisted: persisted });
        if (!persisted && navigator.storage.persist) {
          navigator.storage.persist().then((granted) => {
            set({ isStoragePersisted: granted });
          }).catch(() => {});
        }
      }).catch(() => {});
    }

    // 3. Storage Quota Estimation
    if (navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then((estimate) => {
        const usageMB = Math.round((estimate.usage || 0) / (1024 * 1024));
        const quotaMB = Math.round((estimate.quota || 0) / (1024 * 1024));
        set({ storageEstimate: { usageMB, quotaMB } });
      }).catch(() => {});
    }

    // 4. Capture beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      set({
        deferredPrompt: e as BeforeInstallPromptEvent,
        isInstallable: true,
      });
    });

    // 5. Detect appinstalled
    window.addEventListener('appinstalled', () => {
      set({
        isInstalled: true,
        isInstallable: false,
        deferredPrompt: null,
      });
    });

    // 6. Detect if already running in standalone display mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (isStandalone) {
      set({ isInstalled: true, isInstallable: false });
    }
  },

  promptInstall: async () => {
    const { deferredPrompt } = get();
    if (!deferredPrompt) return false;

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        set({ isInstalled: true, isInstallable: false, deferredPrompt: null });
        return true;
      }
    } catch (err) {
      console.warn('[PWA] Install prompt error:', err);
    }
    return false;
  },

  requestPersistentStorage: async () => {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
      try {
        const granted = await navigator.storage.persist();
        set({ isStoragePersisted: granted });
        return granted;
      } catch (err) {
        console.warn('[PWA] Persistent storage request failed:', err);
      }
    }
    return false;
  },

  checkOfflinePackageInstalled: async () => {
    try {
      const cached = await isOfflinePackageCached();
      set({ isOfflinePackageInstalled: cached });
      return cached;
    } catch {
      return false;
    }
  },

  startOfflineDownload: async () => {
    set({
      downloadStatus: 'downloading',
      downloadError: null,
      downloadProgress: null,
    });

    try {
      // Trigger promptInstall concurrently if available
      get().promptInstall().catch(() => {});

      await downloadAndCacheOfflinePackage((progress) => {
        set({ downloadProgress: progress });
      });

      set({
        downloadStatus: 'completed',
        isOfflinePackageInstalled: true,
      });

      // Update quota estimate after download
      if (navigator.storage && navigator.storage.estimate) {
        navigator.storage.estimate().then((estimate) => {
          const usageMB = Math.round((estimate.usage || 0) / (1024 * 1024));
          const quotaMB = Math.round((estimate.quota || 0) / (1024 * 1024));
          set({ storageEstimate: { usageMB, quotaMB } });
        }).catch(() => {});
      }

      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'حدث خطأ أثناء تحميل حزمة الموارد';
      set({
        downloadStatus: 'error',
        downloadError: msg,
      });
      return false;
    }
  },

  deleteOfflinePackage: async () => {
    await clearOfflinePackage();
    set({
      isOfflinePackageInstalled: false,
      downloadStatus: 'idle',
      downloadProgress: null,
    });
  },
}));
