/**
 * Ward Bulletin PWA Utility
 * Manages route-scoped PWA lifecycle exclusively for /visitbulletin
 */

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

type PwaStateListener = (state: {
  isInstallable: boolean;
  isInstalled: boolean;
  isIos: boolean;
}) => void;

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<PwaStateListener>();

export function isBulletinInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  const isIosStandalone = (window.navigator as any).standalone === true;
  return isStandalone || isIosStandalone;
}

export function isIosDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !(window as any).MSStream
  );
}

function notifyListeners() {
  const state = {
    isInstallable: !!deferredPrompt,
    isInstalled: isBulletinInstalled(),
    isIos: isIosDevice(),
  };
  listeners.forEach((listener) => listener(state));
}

export function subscribePwaState(listener: PwaStateListener): () => void {
  listeners.add(listener);
  listener({
    isInstallable: !!deferredPrompt,
    isInstalled: isBulletinInstalled(),
    isIos: isIosDevice(),
  });

  return () => {
    listeners.delete(listener);
  };
}

/**
 * Injects the Ward Bulletin manifest only when on /visitbulletin
 */
export function attachBulletinManifest() {
  if (typeof document === 'undefined') return;
  let link = document.getElementById('bulletin-pwa-manifest') as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.id = 'bulletin-pwa-manifest';
    link.rel = 'manifest';
    link.href = '/visitbulletin/manifest.json';
    document.head.appendChild(link);
  }
}

/**
 * Detaches the manifest when navigating away from /visitbulletin
 */
export function detachBulletinManifest() {
  if (typeof document === 'undefined') return;
  const link = document.getElementById('bulletin-pwa-manifest');
  if (link && link.parentNode) {
    link.parentNode.removeChild(link);
  }
}

/**
 * Registers the route-scoped service worker
 */
export async function registerBulletinServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.register('/visitbulletin/sw.js', {
      scope: '/visitbulletin',
    });
    console.log('[Ward Bulletin] Service worker registered with scope:', registration.scope);
  } catch (error) {
    console.warn('[Ward Bulletin] Service worker registration failed:', error);
  }
}

/**
 * Initializes the PWA lifecycle for /visitbulletin
 */
export function initializeBulletinPwa() {
  if (typeof window === 'undefined') return () => {};

  attachBulletinManifest();
  registerBulletinServiceWorker();

  const handleBeforeInstallPrompt = (e: Event) => {
    // Prevent the default mini-infobar or automatic prompt
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    notifyListeners();
  };

  const handleAppInstalled = () => {
    deferredPrompt = null;
    notifyListeners();
    console.log('[Ward Bulletin] PWA was installed successfully');
  };

  window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  window.addEventListener('appinstalled', handleAppInstalled);

  return () => {
    window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.removeEventListener('appinstalled', handleAppInstalled);
    detachBulletinManifest();
  };
}

/**
 * Triggers the native install prompt
 */
export async function promptBulletinInstall(): Promise<{ outcome: 'accepted' | 'dismissed' | 'unsupported' }> {
  if (!deferredPrompt) {
    return { outcome: 'unsupported' };
  }

  try {
    await deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;
    if (choiceResult.outcome === 'accepted') {
      deferredPrompt = null;
      notifyListeners();
    }
    return { outcome: choiceResult.outcome };
  } catch (err) {
    console.warn('[Ward Bulletin] Install prompt error:', err);
    return { outcome: 'unsupported' };
  }
}
