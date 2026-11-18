import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { denyUnlessPermitted } from '../../shared/requirePermission.js';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    const denied = await denyUnlessPermitted(base44, user, 'payouts_approve');
    if (denied) return denied;

    const clients = await base44.entities.Client.list();
    let consolidated = 0;
    let totalAmountMoved = 0;
    const errors = [];

    for (const client of clients) {
      try {
        const availablePayout = client.available_payout || 0;
        if (availablePayout > 0) {
          await base44.entities.Client.update(client.id, {
            cashback_earned: (client.cashback_earned || 0) + availablePayout,
            available_payout: 0
          });
          consolidated++;
          totalAmountMoved += availablePayout;
          await sleep(100);
        }
      } catch (err) {
        errors.push({ client_id: client.id, client_name: client.name, error: err.message });
      }
    }

    return Response.json({
      success: true,
      message: `Consolidated ${consolidated} clients. Moved ${totalAmountMoved.toFixed(2)} EGP from available_payout to cashback_earned.`,
      clients_consolidated: consolidated,
      total_amount_moved: totalAmountMoved,
      total_clients_scanned: clients.length,
      errors: errors.length > 0 ? errors : null
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});