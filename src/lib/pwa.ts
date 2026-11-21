import { useState, useEffect, useCallback } from 'react';

// Modern Web Guidance: install-web-app compliance
// Uses navigator.install() when supported, with beforeinstallprompt event fallback.

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface Navigator {
    install?: () => Promise<void>;
    standalone?: boolean;
  }
}

export function registerServiceWorker(
  onUpdate?: (registration: ServiceWorkerRegistration) => void
) {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        // Check for updates
        registration.addEventListener('updatefound', () => {
          const installingWorker = registration.installing;
          if (!installingWorker) return;

          installingWorker.addEventListener('statechange', () => {
            if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New content is available and waiting
              onUpdate?.(registration);
            }
          });
        });
      })
      .catch((error) => {
        console.warn('ServiceWorker registration error:', error);
      });
  });
}

export function usePWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );
  const [hasUpdate, setHasUpdate] = useState(false);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    // 1. Detect if already installed / running in standalone mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as any).standalone === true ||
      document.referrer.includes('android-app://');

    if (isStandalone) {
      setIsInstalled(true);
      setIsInstallable(false);
    }

    // Modern Web Install API check
    const supportsWebInstall = typeof (navigator as any).install === 'function';
    if (supportsWebInstall && !isStandalone) {
      setIsInstallable(true);
    }

    // 2. beforeinstallprompt fallback
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    // 3. appinstalled event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    // 4. Online/Offline events
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Register Service Worker and listen for updates
    registerServiceWorker((reg) => {
      setHasUpdate(true);
      setSwRegistration(reg);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const installApp = useCallback(async (): Promise<'success' | 'aborted' | 'error'> => {
    // Check modern Web Install API first
    if (typeof (navigator as any).install === 'function') {
      try {
        await (navigator as any).install();
        setIsInstallable(false);
        setIsInstalled(true);
        return 'success';
      } catch (err: any) {
        if (err.name === 'AbortError') {
          return 'aborted';
        }
        console.error('navigator.install error:', err);
      }
    }

    // Fallback to beforeinstallprompt event
    if (!deferredPrompt) {
      return 'error';
    }

    const promptEvent = deferredPrompt;
    // Discard deferred event before awaiting to avoid re-triggering single-use event
    setDeferredPrompt(null);

    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstallable(false);
        setIsInstalled(true);
        return 'success';
      }
      return 'aborted';
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return 'aborted';
      }
      console.error('PWA install prompt error:', err);
      return 'error';
    }
  }, [deferredPrompt]);

  const updateApp = useCallback(() => {
    if (swRegistration && swRegistration.waiting) {
      swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    } else {
      window.location.reload();
    }
  }, [swRegistration]);

  return {
    isInstallable,
    isInstalled,
    isOffline,
    hasUpdate,
    installApp,
    updateApp,
  };
}
