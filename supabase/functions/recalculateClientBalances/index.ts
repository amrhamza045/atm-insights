import { corsHeaders } from '../_shared/cors.ts';
import {  createClientFromRequest  } from '../_shared/base44Client.ts';
import { denyUnlessPermitted } from '../_shared/requirePermission.js';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        const denied = await denyUnlessPermitted(base44, user, 'purchases_approve');
        if (denied) return denied;

        // Fetch all clients
        const clients = await base44.asServiceRole.entities.Client.list('', 1000);
        
        // Fetch all transactions
        const transactions = await base44.asServiceRole.entities.CashbackTransaction.list('', 10000);
        
        // Fetch all orders with cashback used
        const ordersWithCashback = await base44.asServiceRole.entities.Order.filter({ cashback_used: { $gt: 0 } }, '', 1000);
        
        const updates = [];
        
        for (const client of clients) {
            // Calculate cashback earned from transactions
            const clientTransactions = transactions.filter(t => t.client_id === client.id);
            
            const totalCashbackEarned = clientTransactions.reduce((sum, t) => {
                return sum + (t.cashback_amount || 0);
            }, 0);
            
            const totalPayoutEarned = clientTransactions.reduce((sum, t) => {
                return sum + (t.payout_amount || 0);
            }, 0);
            
            // Calculate cashback consumed from orders
            const clientOrders = ordersWithCashback.filter(o => o.customer_id === client.id);
            const totalCashbackConsumed = clientOrders.reduce((sum, o) => {
                return sum + (o.cashback_used || 0);
            }, 0);
            
            // Calculate available payout (payout earned - consumed as cashback in eligible orders)
            const availablePayout = totalPayoutEarned;
            
            // Check if update needed
            const needsUpdate = 
                Math.abs((client.cashback_earned || 0) - totalCashbackEarned) > 0.01 ||
                Math.abs((client.payout_earned || 0) - totalPayoutEarned) > 0.01 ||
                Math.abs((client.cashback_consumed || 0) - totalCashbackConsumed) > 0.01 ||
                Math.abs((client.available_payout || 0) - availablePayout) > 0.01 ||
                Math.abs((client.total_payout || 0) - totalPayoutEarned) > 0.01;
            
            if (needsUpdate) {
                updates.push({
                    id: client.id,
                    name: client.name,
                    email: client.email,
                    old: {
                        cashback_earned: client.cashback_earned || 0,
                        payout_earned: client.payout_earned || 0,
                        cashback_consumed: client.cashback_consumed || 0,
                        available_payout: client.available_payout || 0,
                        total_payout: client.total_payout || 0
                    },
                    new: {
                        cashback_earned: totalCashbackEarned,
                        payout_earned: totalPayoutEarned,
                        cashback_consumed: totalCashbackConsumed,
                        available_payout: availablePayout,
                        total_payout: totalPayoutEarned
                    }
                });
                
                // Update client
                await base44.asServiceRole.entities.Client.update(client.id, {
                    cashback_earned: totalCashbackEarned,
                    payout_earned: totalPayoutEarned,
                    cashback_consumed: totalCashbackConsumed,
                    available_payout: availablePayout,
                    total_payout: totalPayoutEarned
                });
            }
        }

        return Response.json({
            success: true,
            total_clients_checked: clients.length,
            clients_updated: updates.length,
            updates: updates
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  try {
    const res = await handler(req);
    const newHeaders = new Headers(res.headers);
    for (const [k, v] of Object.entries(corsHeaders)) {
      newHeaders.set(k, v);
    }
    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: newHeaders,
    });
  } catch (err: any) {
    return Response.json({ error: err.message || String(err) }, {
      status: 500,
      headers: corsHeaders,
    });
  }
});
