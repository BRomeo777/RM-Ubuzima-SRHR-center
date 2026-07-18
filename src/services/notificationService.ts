/**
 * Professional Notification Service for RM Ubuzima
 * Implements push notifications like WhatsApp and LinkedIn
 * Works on both mobile (PWA) and desktop
 */

import { usePersistentStore } from '../store';

// Types for notifications
export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, any>;
  requireInteraction?: boolean;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

// Check if notifications are supported
export const isNotificationSupported = (): boolean => {
  return typeof window !== 'undefined' && 'Notification' in window;
};

// Check if service workers are supported (required for push notifications)
export const isServiceWorkerSupported = (): boolean => {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator;
};

// Get current notification permission status
export const getNotificationPermission = (): NotificationPermission | null => {
  if (!isNotificationSupported()) return null;
  return Notification.permission;
};

// Request notification permission
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!isNotificationSupported()) {
    throw new Error('Notifications not supported on this device');
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (error) {
    console.error('[NotificationService] Error requesting permission:', error);
    return 'default';
  }
};

// Register service worker for push notifications
export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (!isServiceWorkerSupported()) {
    console.warn('[NotificationService] Service workers not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/notification-sw.js');
    console.log('[NotificationService] Service Worker registered:', registration);
    return registration;
  } catch (error) {
    console.error('[NotificationService] Service Worker registration failed:', error);
    return null;
  }
};

// Check if user has enabled notifications in app settings AND has browser permission
export const canSendNotifications = (): boolean => {
  const { notificationsEnabled } = usePersistentStore.getState();
  const browserPermission = getNotificationPermission();
  
  return notificationsEnabled && browserPermission === 'granted';
};

// Send a local notification (works when app is open or in background)
export const sendLocalNotification = (payload: PushNotificationPayload): Notification | null => {
  if (!canSendNotifications()) {
    console.log('[NotificationService] Notifications disabled or permission denied');
    return null;
  }

  try {
    const notificationOptions: NotificationOptions = {
      body: payload.body,
      icon: payload.icon || '/icon-192x192.png',
      badge: payload.badge || '/icon-72x72.png',
      tag: payload.tag || 'default',
      data: payload.data || {},
      requireInteraction: payload.requireInteraction ?? false,
    };

    // Add actions if provided (not supported in all browsers, so we cast)
    if (payload.actions && payload.actions.length > 0) {
      (notificationOptions as any).actions = payload.actions;
    }

    const notification = new Notification(payload.title, notificationOptions);

    // Handle notification click
    notification.onclick = (event) => {
      event.preventDefault();
      window.focus();
      
      // Navigate based on notification data
      if (payload.data?.url) {
        window.location.href = payload.data.url;
      }
      
      notification.close();
    };

    console.log('[NotificationService] Notification sent:', payload.title);
    return notification;
  } catch (error) {
    console.error('[NotificationService] Error sending notification:', error);
    return null;
  }
};

// Send notification via Service Worker (works when app is closed on mobile)
export const sendPushNotification = async (payload: PushNotificationPayload): Promise<boolean> => {
  if (!canSendNotifications()) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    
    const notificationOptions: NotificationOptions & { [key: string]: any } = {
      body: payload.body,
      icon: payload.icon || '/icon-192x192.png',
      badge: payload.badge || '/icon-72x72.png',
      tag: payload.tag || 'default',
      data: payload.data || {},
      requireInteraction: payload.requireInteraction ?? false,
      // Android-specific: vibration pattern
      vibrate: [200, 100, 200],
      // iOS-specific: notification sound
      silent: false,
      // Add actions if provided
      actions: payload.actions || [
        { action: 'open', title: 'Open' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
    };

    await registration.showNotification(payload.title, notificationOptions);

    console.log('[NotificationService] Push notification sent:', payload.title);
    return true;
  } catch (error) {
    console.error('[NotificationService] Error sending push notification:', error);
    // Fallback to local notification
    return sendLocalNotification(payload) !== null;
  }
};

// Initialize notification system on app startup
export const initializeNotifications = async (): Promise<boolean> => {
  if (!isNotificationSupported()) {
    console.warn('[NotificationService] Notifications not supported');
    return false;
  }

  const { notificationsEnabled } = usePersistentStore.getState();
  
  // If notifications are enabled by default but permission not granted, request it
  if (notificationsEnabled && Notification.permission === 'default') {
    const permission = await requestNotificationPermission();
    
    if (permission === 'granted') {
      // Register service worker for push support
      await registerServiceWorker();
      
      // Send welcome notification
      sendLocalNotification({
        title: '🔔 Notifications Enabled',
        body: 'You will now receive important updates, messages, and alerts from RM Ubuzima.',
        tag: 'welcome-notification',
      });
      
      return true;
    }
  }

  // If already granted, ensure service worker is registered
  if (Notification.permission === 'granted') {
    await registerServiceWorker();
    return true;
  }

  return false;
};

// Notification templates for different events
export const NotificationTemplates = {
  // New message notification (like WhatsApp)
  newMessage: (senderName: string, messagePreview: string, chatUrl: string): PushNotificationPayload => ({
    title: `💬 ${senderName}`,
    body: messagePreview.length > 100 ? messagePreview.substring(0, 100) + '...' : messagePreview,
    tag: `message-${Date.now()}`,
    icon: '/icon-192x192.png',
    data: {
      type: 'message',
      url: chatUrl,
    },
    requireInteraction: false,
    actions: [
      { action: 'reply', title: 'Reply' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  }),

  // New inbox message from facilitator
  newInboxMessage: (senderName: string, subject: string, inboxUrl: string): PushNotificationPayload => ({
    title: `📩 ${senderName}`,
    body: subject,
    tag: `inbox-${Date.now()}`,
    icon: '/icon-192x192.png',
    data: {
      type: 'inbox',
      url: inboxUrl,
    },
    requireInteraction: false,
  }),

  // Group activity notification (like LinkedIn)
  groupActivity: (groupName: string, activity: string, groupUrl: string): PushNotificationPayload => ({
    title: `👥 ${groupName}`,
    body: activity,
    tag: `group-${Date.now()}`,
    icon: '/icon-192x192.png',
    data: {
      type: 'group',
      url: groupUrl,
    },
    requireInteraction: false,
  }),

  // SRHR content update
  contentUpdate: (title: string, description: string, url: string): PushNotificationPayload => ({
    title: `📚 ${title}`,
    body: description,
    tag: `content-${Date.now()}`,
    icon: '/icon-192x192.png',
    data: {
      type: 'content',
      url,
    },
    requireInteraction: false,
  }),

  // Appointment reminder
  appointmentReminder: (facilityName: string, time: string, url: string): PushNotificationPayload => ({
    title: '📅 Appointment Reminder',
    body: `Your appointment at ${facilityName} is ${time}`,
    tag: `appointment-${Date.now()}`,
    icon: '/icon-192x192.png',
    data: {
      type: 'appointment',
      url,
    },
    requireInteraction: true,
  }),

  // Emergency alert
  emergencyAlert: (title: string, message: string, url: string): PushNotificationPayload => ({
    title: `🚨 ${title}`,
    body: message,
    tag: `emergency-${Date.now()}`,
    icon: '/icon-192x192.png',
    badge: '/icon-72x72.png',
    data: {
      type: 'emergency',
      url,
    },
    requireInteraction: true,
  }),

  // AI post notification
  aiPost: (aiName: string, topic: string, url: string): PushNotificationPayload => ({
    title: `🤖 ${aiName}`,
    body: `New post: ${topic}`,
    tag: `ai-post-${Date.now()}`,
    icon: '/icon-192x192.png',
    data: {
      type: 'ai-post',
      url,
    },
    requireInteraction: false,
  }),

  // Status update notification
  statusUpdate: (userName: string, preview: string, url: string): PushNotificationPayload => ({
    title: `📱 ${userName} shared a status`,
    body: preview,
    tag: `status-${Date.now()}`,
    icon: '/icon-192x192.png',
    data: {
      type: 'status',
      url,
    },
    requireInteraction: false,
  }),

  // General system notification
  system: (title: string, message: string, url?: string): PushNotificationPayload => ({
    title,
    body: message,
    tag: `system-${Date.now()}`,
    icon: '/icon-192x192.png',
    data: {
      type: 'system',
      url: url || '/',
    },
    requireInteraction: false,
  }),
};

// Helper to send notifications with proper fallbacks
export const notify = async (payload: PushNotificationPayload): Promise<boolean> => {
  // Try push notification first (works when app is closed on mobile PWA)
  if (isServiceWorkerSupported()) {
    const pushSent = await sendPushNotification(payload);
    if (pushSent) return true;
  }

  // Fallback to local notification (works when app is open)
  const localSent = sendLocalNotification(payload);
  return localSent !== null;
};

// Close all notifications
export const closeAllNotifications = (): void => {
  if (!isServiceWorkerSupported()) return;
  
  navigator.serviceWorker.ready.then((registration) => {
    registration.getNotifications().then((notifications) => {
      notifications.forEach((notification) => notification.close());
    });
  });
};

// Check and log notification status (for debugging)
export const logNotificationStatus = (): void => {
  console.log('[NotificationService] Status:', {
    supported: isNotificationSupported(),
    serviceWorkerSupported: isServiceWorkerSupported(),
    permission: getNotificationPermission(),
    enabled: usePersistentStore.getState().notificationsEnabled,
    canSend: canSendNotifications(),
  });
};
