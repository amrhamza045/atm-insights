/**
 * Helper functions for managing push notifications
 */

export const sendPushNotification = (title, options = {}) => {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, {
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      ...options
    });
  }
};

export const sendToastAndPush = (toast, notificationType, title, message, preferences) => {
  // Check if this notification type is enabled
  const preferenceKey = getPreferenceKeyForType(notificationType);
  if (preferences && !preferences[preferenceKey]) {
    return;
  }

  // Send toast notification (always visible in app)
  if (notificationType === 'success' || notificationType === 'payout_approvals') {
    toast.success(title, { description: message });
  } else if (notificationType === 'error') {
    toast.error(title, { description: message });
  } else {
    toast.message(title, { description: message });
  }

  // Send push notification if enabled
  if (preferences?.push_enabled && preferences?.[preferenceKey]) {
    sendPushNotification(title, { body: message });
  }
};

export const getPreferenceKeyForType = (notificationType) => {
  const typeMap = {
    payout: 'payout_approvals',
    redemption: 'reward_redemptions',
    cashback: 'significant_cashback',
    promotion: 'promotions',
    tier: 'tier_updates'
  };
  return typeMap[notificationType] || 'email_enabled';
};

export const checkPushNotificationSupport = () => {
  return 'Notification' in window;
};

export const isPushNotificationEnabled = () => {
  return 'Notification' in window && Notification.permission === 'granted';
};

export const requestPushPermission = async () => {
  if (!('Notification' in window)) {
    return false;
  }
  
  if (Notification.permission === 'granted') {
    return true;
  }
  
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  
  return false;
};