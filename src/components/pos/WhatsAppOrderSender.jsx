import { base44 } from "@/api/base44Client";

export const sendOrderWhatsApp = async (orderId) => {
  try {
    await base44.functions.invoke('sendOrderWhatsApp', { order_id: orderId });
  } catch (error) {
    console.log('WhatsApp notification failed:', error);
  }
};