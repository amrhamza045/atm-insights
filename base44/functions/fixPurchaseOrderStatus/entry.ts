import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { denyUnlessPermitted } from '../../shared/requirePermission.js';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    const denied = await denyUnlessPermitted(base44, user, 'purchases_approve');
    if (denied) return denied;

    const { orderNumber, newStatus } = await req.json();

    if (!orderNumber || !newStatus) {
      return Response.json({ error: 'orderNumber and newStatus are required' }, { status: 400 });
    }

    // Find the order
    const orders = await base44.entities.PurchaseOrder.filter({ order_number: orderNumber });
    if (orders.length === 0) {
      return Response.json({ error: 'Order not found' }, { status: 404 });
    }

    const order = orders[0];

    // Update status
    await base44.entities.PurchaseOrder.update(order.id, { status: newStatus });

    return Response.json({ 
      success: true, 
      message: `Order ${orderNumber} status updated to ${newStatus}`,
      order: { id: order.id, order_number: order.order_number, status: newStatus }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});