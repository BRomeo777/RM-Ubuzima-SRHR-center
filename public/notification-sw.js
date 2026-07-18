/**
 * Service Worker for RM Ubuzima Push Notifications
 * Handles background notifications like WhatsApp and LinkedIn
 * This enables notifications even when the app is closed
 */

const CACHE_NAME = 'rm-ubuzima-notifications-v1';

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('[Notification SW] Installing...');
  self.skipWaiting();
});

// Activate event - claim clients
self.addEventListener('activate', (event) => {
  console.log('[Notification SW] Activating...');
  event.waitUntil(self.clients.claim());
});

// Push event - receive push notifications from server (future enhancement)
self.addEventListener('push', (event) => {
  console.log('[Notification SW] Push received:', event);

  if (!event.data) return;

  try {
    const payload = event.data.json();
    
    const options = {
      body: payload.body || 'New notification from RM Ubuzima',
      icon: payload.icon || '/icon-192x192.png',
      badge: payload.badge || '/icon-72x72.png',
      tag: payload.tag || `push-${Date.now()}`,
      data: payload.data || {},
      requireInteraction: payload.requireInteraction ?? false,
      actions: payload.actions || [
        { action: 'open', title: 'Open' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
      vibrate: [200, 100, 200],
      silent: false,
    };

    event.waitUntil(
      self.registration.showNotification(
        payload.title || 'RM Ubuzima',
        options
      )
    );
  } catch (error) {
    console.error('[Notification SW] Error handling push:', error);
    
    // Fallback notification
    event.waitUntil(
      self.registration.showNotification('RM Ubuzima', {
        body: 'You have a new notification',
        icon: '/icon-192x192.png',
        badge: '/icon-72x72.png',
      })
    );
  }
});

// Notification click event - handle user interaction
self.addEventListener('notificationclick', (event) => {
  console.log('[Notification SW] Notification clicked:', event);
  
  event.notification.close();

  const notificationData = event.notification.data || {};
  const action = event.action;

  // Handle different actions
  if (action === 'dismiss') {
    // Just close the notification
    return;
  }

  // Default behavior: open the app and navigate to relevant page
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        const url = notificationData.url || '/';

        // If app is already open, focus it and navigate
        for (const client of clientList) {
          if (client.url && 'focus' in client) {
            client.focus();
            // Navigate to the relevant page
            client.postMessage({
              type: 'NOTIFICATION_CLICK',
              url: url,
              notificationData: notificationData,
            });
            return;
          }
        }

        // If app is not open, open it
        if (self.clients.openWindow) {
          return self.clients.openWindow(url);
        }
      })
  );
});

// Message event - handle messages from main app
self.addEventListener('message', (event) => {
  console.log('[Notification SW] Message received:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Background sync (for offline support - future enhancement)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-notifications') {
    console.log('[Notification SW] Background sync triggered');
    // Future: sync pending notifications with server
  }
});

// Periodic background sync (for checking new messages - future enhancement)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-messages') {
    console.log('[Notification SW] Periodic sync triggered');
    // Future: check for new messages in background
  }
});
