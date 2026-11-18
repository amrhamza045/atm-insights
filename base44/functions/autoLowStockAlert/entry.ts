import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { usersWithPermission } from '../../shared/permissionRecipients.js';
import { getJobNumber } from '../../shared/scheduleGate.js';
import { denyUnlessPermitted } from '../../shared/requirePermission.js';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    const denied = await denyUnlessPermitted(base44, user, 'inventory_manage');
    if (denied) return denied;
    const { event, data, old_data } = await req.json();

    // Only process if this is an update and quantity decreased
    if (event.type !== 'update' || !data || !old_data) {
      return Response.json({ message: 'Not applicable' });
    }

    const oldQuantity = old_data.quantity || 0;
    const newQuantity = data.quantity || 0;
    const threshold = Number(data.low_stock_threshold) > 0
      ? Number(data.low_stock_threshold)
      : await getJobNumber(base44.asServiceRole, 'default_low_stock_threshold');

    // Check if item just fell below threshold
    if (oldQuantity >= threshold && newQuantity < threshold) {
      // Get system settings for notification preferences
      const settings = await base44.asServiceRole.entities.SystemSettings.list();
      const systemSettings = settings[0];

      if (!systemSettings?.enable_low_stock_alerts) {
        return Response.json({ message: 'Low stock alerts disabled' });
      }

      // Recipients: everyone holding inventory_manage (role + overrides)
      const adminUsers = await usersWithPermission(base44.asServiceRole, 'inventory_manage');

      // Send email notifications if enabled
      if (systemSettings.send_low_stock_emails) {
        for (const admin of adminUsers) {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: admin.email,
            subject: '⚠️ Low Stock Alert - Action Required',
            body: `
              <h2>Low Stock Alert</h2>
              <p><strong>${data.name}</strong> is running low and needs to be reordered.</p>
              <ul>
                <li><strong>Current Stock:</strong> ${newQuantity} ${data.unit}</li>
                <li><strong>Low Stock Threshold:</strong> ${threshold} ${data.unit}</li>
                <li><strong>Category:</strong> ${data.category_name || 'N/A'}</li>
                ${data.supplier ? `<li><strong>Preferred Supplier:</strong> ${data.supplier}</li>` : ''}
              </ul>
              <p>Consider creating a purchase order to restock this item.</p>
            `
          });
        }
      }

      // Send SMS if enabled
      if (systemSettings.send_low_stock_sms) {
        try {
          await base44.asServiceRole.functions.invoke('sendSMS', {
            message: `Low Stock Alert: ${data.name} - ${newQuantity} ${data.unit} remaining (threshold: ${threshold}). Reorder needed.`
          });
        } catch (error) {
          console.error('SMS failed:', error);
        }
      }

      return Response.json({ 
        success: true, 
        message: 'Low stock alert sent',
        item: data.name,
        quantity: newQuantity
      });
    }

    return Response.json({ message: 'No alert needed' });
  } catch (error) {
    console.error('Low stock alert error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});