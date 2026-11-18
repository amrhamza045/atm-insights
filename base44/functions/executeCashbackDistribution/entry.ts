import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { denyUnlessPermitted } from '../../shared/requirePermission.js';

// Helper: sleep for ms milliseconds
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper: fetch with retry on 429
async function withRetry(fn, retries = 3, delayMs = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (err?.status === 429 || err?.message?.includes('429') || err?.message?.includes('Rate limit')) {
        if (i < retries - 1) {
          await sleep(delayMs * (i + 1));
          continue;
        }
      }
      throw err;
    }
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    const denied = await denyUnlessPermitted(base44, user, 'payouts_approve');
    if (denied) return denied;

    const { pending_id } = await req.json();

    if (!pending_id) {
      return Response.json({ error: 'pending_id is required' }, { status: 400 });
    }

    // Fetch pending distribution
    const pendings = await withRetry(() => base44.entities.CashbackDistributionPending.filter({ id: pending_id }));
    const pending = pendings[0];

    if (!pending) {
      return Response.json({ error: 'Pending distribution not found' }, { status: 404 });
    }

    if (pending.status !== 'approved') {
      return Response.json({
        error: `Cannot execute: status is ${pending.status}, expected 'approved'`
      }, { status: 400 });
    }

    // Distribute to customer — all cashback goes to cashback_earned (no payout split)
    const customerTotalCashback = (pending.cashback_to_customer || 0) + (pending.payout_to_customer || 0);
    if (customerTotalCashback > 0) {
      await sleep(200);
      const customers = await withRetry(() => base44.entities.Client.filter({ id: pending.customer_id }));

      if (customers[0]) {
        const customer = customers[0];
        await sleep(200);
        await withRetry(() => base44.entities.Client.update(pending.customer_id, {
          cashback_earned: (customer.cashback_earned || 0) + customerTotalCashback
        }));

        await sleep(200);
        await withRetry(() => base44.entities.CashbackTransaction.create({
          client_id: pending.customer_id,
          client_name: pending.customer_name,
          transaction_type: 'order_cashback',
          amount: customerTotalCashback,
          cashback_amount: customerTotalCashback,
          payout_amount: 0,
          source_client_id: pending.customer_id,
          source_client_name: pending.customer_name,
          purchase_amount: pending.order_total,
          description: `Cashback from order #${pending.order_id}`
        }));
      }
    }

    // Distribute to referrers — all cashback goes to cashback_earned (no payout split)
    for (const referralDetail of pending.referral_cashback_details || []) {
      await sleep(300);
      const referrers = await withRetry(() => base44.entities.Client.filter({ id: referralDetail.referrer_id }));

      if (referrers[0]) {
        const referrer = referrers[0];
        const referralCashbackAmount = referralDetail.cashback_amount;

        await sleep(200);
        await withRetry(() => base44.entities.Client.update(referralDetail.referrer_id, {
          cashback_earned: (referrer.cashback_earned || 0) + referralCashbackAmount
        }));

        await sleep(200);
        await withRetry(() => base44.entities.CashbackTransaction.create({
          client_id: referralDetail.referrer_id,
          client_name: referralDetail.referrer_name,
          transaction_type: 'referral_cashback',
          amount: referralCashbackAmount,
          cashback_amount: referralCashbackAmount,
          payout_amount: 0,
          source_client_id: pending.customer_id,
          source_client_name: pending.customer_name,
          purchase_amount: pending.order_total,
          referral_level: referralDetail.referral_level,
          cashback_rate: referralDetail.cashback_rate,
          description: `Referral cashback (Level ${referralDetail.referral_level}) from customer order #${pending.order_id}`
        }));
      }
    }

    // Mark order as auto_cashback_generated
    await sleep(200);
    await withRetry(() => base44.entities.Order.update(pending.order_id, {
      auto_cashback_generated: true
    }));

    // Update pending status to executed
    await sleep(200);
    await withRetry(() => base44.entities.CashbackDistributionPending.update(pending_id, {
      status: 'executed',
      executed_by: user.email,
      execution_timestamp: new Date().toISOString()
    }));

    return Response.json({
      success: true,
      message: 'Cashback distribution executed successfully (all cashback to cashback_earned)',
      pending_id
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});