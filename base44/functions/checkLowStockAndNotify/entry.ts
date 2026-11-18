import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { usersWithPermission } from '../../shared/permissionRecipients.js';
import { getJobNumber } from '../../shared/scheduleGate.js';
import { denyUnlessPermitted } from '../../shared/requirePermission.js';
import { sendViaTwilio } from '../../shared/twilioSms.js';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    const denied = await denyUnlessPermitted(base44, user, ['inventory_view', 'inventory_edit', 'inventory_manage']);
    if (denied) return denied;
    
    // Get all inventory items
    const inventoryItems = await base44.asServiceRole.entities.InventoryItem.list();
    const defaultThreshold = await getJobNumber(base44.asServiceRole, 'default_low_stock_threshold');
    
    // Filter low stock items
    const lowStockItems = inventoryItems.filter(item => 
      item.quantity <= (Number(item.low_stock_threshold) > 0 ? Number(item.low_stock_threshold) : defaultThreshold)
    );

    if (lowStockItems.length === 0) {
      return Response.json({ message: 'No low stock items', count: 0 });
    }

    // Recipients: everyone holding inventory_manage (role + overrides)
    const adminUsers = await usersWithPermission(base44.asServiceRole, 'inventory_manage');

    // Get SMS preferences for admins
    const smsPreferences = await base44.asServiceRole.entities.SMSNotificationPreferences.list();
    
    let sentCount = 0;
    for (const admin of adminUsers) {
      const prefs = smsPreferences.find(p => p.user_id === admin.id);
      
      if (prefs?.low_stock_alerts && prefs?.phone_number) {
        const itemsList = lowStockItems
          .map(item => `${item.name}: ${item.quantity} ${item.unit}`)
          .join(', ');
        
        const message = `LOW STOCK ALERT: ${lowStockItems.length} items need restocking. ${itemsList.substring(0, 100)}${itemsList.length > 100 ? '...' : ''}`;
        
        try {
          const out = await sendViaTwilio(prefs.phone_number, message);
          if (!out.ok) throw new Error(out.body?.error || 'SMS failed');
          sentCount++;
        } catch (error) {
          console.error(`Failed to send SMS to ${admin.email}:`, error);
        }
      }
    }

    return Response.json({ 
      success: true,
      lowStockCount: lowStockItems.length,
      notificationsSent: sentCount,
      items: lowStockItems.map(i => ({ name: i.name, quantity: i.quantity, unit: i.unit }))
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});