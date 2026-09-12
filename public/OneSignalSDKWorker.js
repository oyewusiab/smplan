importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');

// Prevent OneSignal telemetry unhandled promise rejection for local test notifications
self.addEventListener('unhandledrejection', (event) => {
  if (event.reason && (String(event.reason).includes('notificationId') || String(event.reason?.message).includes('notificationId'))) {
    event.preventDefault();
  }
});
