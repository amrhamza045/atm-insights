import { base44 } from "@/api/base44Client";
import { getBrandName } from "@/lib/brandName";

// Helper to send multi-channel notifications
async function sendMultiChannelNotification({ 
  clientId, 
  clientEmail, 
  title, 
  message, 
  type, 
  preferenceKey = null 
}) {
  try {
    // Get user preferences
    const prefs = await base44.entities.UserNotificationPreferences.filter({ client_id: clientId });
    const userPrefs = prefs[0];

    // Check if this notification type is enabled
    if (preferenceKey && userPrefs && !userPrefs[preferenceKey]) {
      return; // User has disabled this notification type
    }

    // Create in-app notification
    await base44.entities.Notification.create({
      client_id: clientId,
      client_email: clientEmail,
      title,
      message,
      type,
      read: false
    });

    // Send push notification (browser)
    if (userPrefs?.push_enabled && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body: message, icon: '/icon.png' });
    }

    // Email notification (via SendEmail integration)
    if (userPrefs?.email_enabled) {
      try {
        await base44.integrations.Core.SendEmail({
          to: clientEmail,
          subject: title,
          body: message
        });
      } catch (error) {
        console.error("Failed to send email:", error);
      }
    }

    // SMS notification (requires backend functions)
    // If you enable backend functions, you can implement SMS via Twilio or similar
    // if (userPrefs?.sms_enabled && userPrefs?.phone) {
    //   await sendSMS(userPrefs.phone, message);
    // }
  } catch (error) {
    console.error("Failed to send notification:", error);
  }
}

export async function notifyMilestoneAchievement(clientId, clientEmail, milestoneName, bonusAmount) {
  await sendMultiChannelNotification({
    clientId,
    clientEmail,
    title: `🏆 Milestone Achieved: ${milestoneName}!`,
    message: `Congratulations! You've earned £${bonusAmount} bonus for reaching the ${milestoneName} milestone. Keep referring to unlock more rewards!`,
    type: "milestone",
    preferenceKey: "tier_updates"
  });
}

export async function notifyRegistrationApproved(clientId, clientEmail, referralCode) {
  await sendMultiChannelNotification({
    clientId,
    clientEmail,
    title: `Welcome to ${await getBrandName()} Partner! 🎉`,
    message: `Your registration has been approved! Your referral code is ${referralCode}. Start referring friends to earn cashback.`,
    type: "registration",
    preferenceKey: "referral_updates"
  });
}

export async function notifyRedemptionProcessed(clientId, clientEmail, rewardName, redemptionCode, status) {
  const isApproved = status === "used";
  await sendMultiChannelNotification({
    clientId,
    clientEmail,
    title: isApproved ? "Reward Redemption Approved! ✅" : "Redemption Update",
    message: isApproved 
      ? `Your ${rewardName} redemption has been approved! Your code is ${redemptionCode}.`
      : `Your ${rewardName} redemption has been ${status}.`,
    type: "redemption",
    preferenceKey: "cashback_updates"
  });
}

// Order status notifications
export async function notifyOrderStatusChange(clientId, clientEmail, orderId, status, orderDetails) {
  const messages = {
    pending: "Your order has been received and is being processed.",
    preparing: "Your order is now being prepared in the kitchen! 👨‍🍳",
    ready: "Your order is ready! Come pick it up or it's on the way! 🎉",
    completed: "Your order has been completed. Enjoy your meal! 😋"
  };

  const statusKey = {
    pending: "order_placed",
    preparing: "order_preparing", 
    ready: "order_ready",
    completed: "order_completed"
  }[status];

  await sendMultiChannelNotification({
    clientId,
    clientEmail,
    title: `Order #${orderId.slice(-6)} - ${status.charAt(0).toUpperCase() + status.slice(1)}`,
    message: messages[status] || `Your order status has been updated to ${status}.`,
    type: "system",
    preferenceKey: statusKey
  });
}

// Promotion notifications
export async function notifyPromotion(clientId, clientEmail, promotionTitle, promotionMessage) {
  await sendMultiChannelNotification({
    clientId,
    clientEmail,
    title: `🎉 ${promotionTitle}`,
    message: promotionMessage,
    type: "promotion",
    preferenceKey: "promotions"
  });
}

// New menu item notifications
export async function notifyNewMenuItem(clientId, clientEmail, itemName, itemDescription, itemPrice) {
  await sendMultiChannelNotification({
    clientId,
    clientEmail,
    title: `🍕 New Menu Item: ${itemName}`,
    message: `Check out our latest addition! ${itemDescription} - Only £${itemPrice}`,
    type: "promotion",
    preferenceKey: "new_menu_items"
  });
}