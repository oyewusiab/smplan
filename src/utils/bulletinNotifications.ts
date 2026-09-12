/**
 * Ward Bulletin PWA - Notifications & Push Manager
 * Manages user preferences, browser permissions, device notifications, and OneSignal Web Push.
 */

declare global {
  interface Window {
    OneSignalDeferred?: any[];
    OneSignal?: any;
  }
}

export const ONESIGNAL_APP_ID = '10734c27-8114-4094-b21a-d803104ed3ff';

export interface BulletinNotificationPreferences {
  enabled: boolean;
  birthdays: boolean;
  dailyScriptures: boolean;
  dailyComeFollowMe: boolean;
  sundayClasses: boolean;
  activities: boolean;
  deliveryHour: number; // 0-23 (e.g. 7 = 7:00 AM)
}

export const DEFAULT_NOTIFICATION_PREFERENCES: BulletinNotificationPreferences = {
  enabled: false,
  birthdays: true,
  dailyScriptures: true,
  dailyComeFollowMe: true,
  sundayClasses: true,
  activities: true,
  deliveryHour: 7,
};

const STORAGE_KEY = 'SM_BULLETIN_NOTIFICATION_PREFS';

/**
 * Initialize OneSignal Web SDK
 */
export function initOneSignal(): void {
  if (typeof window === 'undefined') return;
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(async function (OneSignal: any) {
    try {
      await OneSignal.init({
        appId: ONESIGNAL_APP_ID,
        notifyButton: { enable: false },
        allowLocalhostAsSecureOrigin: true,
      });

      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        try {
          if (prefs.enabled) {
            await OneSignal.User?.PushSubscription?.optIn();
          } else {
            await OneSignal.User?.PushSubscription?.optOut();
          }
        } catch (optErr) {}
      }

      const prefs = getNotificationPreferences();
      if (OneSignal.User) {
        await OneSignal.User.addTags({
          notifications_enabled: '', // Purge old tag to remain within 6-tag limit
          birthdays: prefs.birthdays ? 'true' : 'false',
          dailyScriptures: prefs.dailyScriptures ? 'true' : 'false',
          dailyComeFollowMe: prefs.dailyComeFollowMe ? 'true' : 'false',
          sundayClasses: prefs.sundayClasses ? 'true' : 'false',
          activities: prefs.activities ? 'true' : 'false',
          delivery_hour: String(prefs.deliveryHour ?? 7),
        });
      }
    } catch (e) {
      console.warn('[OneSignal] Initialization notice:', e);
    }
  });
}

/**
 * Sync user preference tags to OneSignal
 */
export function syncOneSignalTags(prefs: BulletinNotificationPreferences): void {
  if (typeof window === 'undefined') return;
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(async function (OneSignal: any) {
    try {
      if (OneSignal.User?.PushSubscription) {
        if (prefs.enabled) {
          await OneSignal.User.PushSubscription.optIn();
        } else {
          await OneSignal.User.PushSubscription.optOut();
        }
      }

      if (OneSignal.User) {
        await OneSignal.User.addTags({
          notifications_enabled: '', // Purge old tag to remain within 6-tag limit
          birthdays: prefs.birthdays ? 'true' : 'false',
          dailyScriptures: prefs.dailyScriptures ? 'true' : 'false',
          dailyComeFollowMe: prefs.dailyComeFollowMe ? 'true' : 'false',
          sundayClasses: prefs.sundayClasses ? 'true' : 'false',
          activities: prefs.activities ? 'true' : 'false',
          delivery_hour: String(prefs.deliveryHour ?? 7),
        });
      }
    } catch (e) {
      console.warn('[OneSignal] Tag sync notice:', e);
    }
  });
}

/**
 * Check if the current browser/device supports notifications
 */
export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;
}

/**
 * Get current browser notification permission
 */
export function getNotificationPermission(): NotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
}

/**
 * Load user notification preferences from localStorage
 */
export function getNotificationPreferences(): BulletinNotificationPreferences {
  if (typeof window === 'undefined') return DEFAULT_NOTIFICATION_PREFERENCES;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_NOTIFICATION_PREFERENCES;
    const parsed = JSON.parse(stored);
    return { ...DEFAULT_NOTIFICATION_PREFERENCES, ...parsed };
  } catch {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }
}

/**
 * Save user notification preferences to localStorage and sync tags
 */
export function saveNotificationPreferences(prefs: BulletinNotificationPreferences): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    syncOneSignalTags(prefs);
  } catch (err) {
    console.warn('[Bulletin Notification] Failed to persist preferences:', err);
  }
}

/**
 * Request notification permission from browser & OneSignal
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window !== 'undefined') {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async function (OneSignal: any) {
      try {
        await OneSignal.Notifications?.requestPermission();
        try {
          await OneSignal.User?.PushSubscription?.optIn();
        } catch {}
        const prefs = getNotificationPreferences();
        if (OneSignal.User) {
          await OneSignal.User.addTags({
            notifications_enabled: '',
            birthdays: prefs.birthdays ? 'true' : 'false',
            dailyScriptures: prefs.dailyScriptures ? 'true' : 'false',
            dailyComeFollowMe: prefs.dailyComeFollowMe ? 'true' : 'false',
            sundayClasses: prefs.sundayClasses ? 'true' : 'false',
            activities: prefs.activities ? 'true' : 'false',
            delivery_hour: String(prefs.deliveryHour ?? 7),
          });
        }
      } catch (e) {
        console.warn('[OneSignal] requestPermission notice:', e);
      }
    });
  }

  if (!isNotificationSupported()) return 'denied';
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.warn('[Bulletin Notification] Error requesting permission:', err);
    return 'denied';
  }
}

/**
 * Send an immediate test notification to verify device notification pop-up
 */
export async function sendTestNotification(categoryTitle = 'Ward Bulletin'): Promise<boolean> {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return false;
  }

  const sampleNotifications: Record<string, { title: string; body: string }> = {
    birthdays: {
      title: '🎂 Ward Birthday Alert',
      body: 'Sister Rachael Oloyede celebrates her birthday today! Wish her well.',
    },
    dailyScriptures: {
      title: '📖 Daily Scripture Study',
      body: 'Trust in the Lord with all thine heart; and lean not unto thine own understanding. (Proverbs 3:5)',
    },
    dailyComeFollowMe: {
      title: '🕊️ Come, Follow Me Reading',
      body: 'Today’s Reading: Focus on the Savior’s teachings and repentance this week.',
    },
    sundayClasses: {
      title: '⛪ Sunday Class Preparation',
      body: 'Elders Quorum & Relief Society: Remember to review this Sunday’s lesson.',
    },
    activities: {
      title: '📅 Ward Activity Today',
      body: 'Ward Family Night & Youth Gathering at 5:00 PM in the cultural hall.',
    },
  };

  const selected = sampleNotifications[categoryTitle] || {
    title: '🔔 Ward Bulletin Notification',
    body: 'Notifications are active! You will receive ward updates directly in your notification bar.',
  };

  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (registration && registration.showNotification) {
        await registration.showNotification(selected.title, {
          body: selected.body,
          icon: '/visitbulletin/icons/icon-192.png',
          badge: '/visitbulletin/icons/icon-192.png',
          vibrate: [100, 50, 100],
          data: { url: '/visitbulletin' },
          tag: 'test-bulletin-notification',
          renotify: true,
        });
        return true;
      }
    }

    new Notification(selected.title, {
      body: selected.body,
      icon: '/visitbulletin/icons/icon-192.png',
    });
    return true;
  } catch (err) {
    console.warn('[Bulletin Notification] Failed to display notification:', err);
    return false;
  }
}

/**
 * Synchronize push subscription and category preferences with backend
 */
export async function syncPushPreferencesWithBackend(
  prefs: BulletinNotificationPreferences,
  apiEndpoint?: string
): Promise<void> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.ready;
    if (!registration.pushManager) return;

    const subscription = await registration.pushManager.getSubscription();

    const payload = {
      action: 'SAVE_BULLETIN_PUSH_SUBSCRIPTION',
      endpoint: subscription ? subscription.endpoint : '',
      subscription: subscription ? JSON.stringify(subscription) : '',
      preferences: JSON.stringify(prefs),
      device: /iPhone|iPad/i.test(navigator.userAgent) ? 'iOS' : 'Android/Web',
      updated_at: new Date().toISOString(),
    };

    if (apiEndpoint) {
      await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }
  } catch (err) {
    console.warn('[Bulletin Notification] Subscription sync skipped/failed:', err);
  }
}