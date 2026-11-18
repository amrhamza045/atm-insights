import { corsHeaders } from '../_shared/cors.ts';
import {  createClientFromRequest  } from '../_shared/base44Client.ts';
import { denyUnlessPermitted } from '../_shared/requirePermission.js';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    const denied = await denyUnlessPermitted(base44, user, 'purchases_approve');
    if (denied) return denied;

    // Get all approved purchase submissions
    const allPurchases = await base44.asServiceRole.entities.PurchaseSubmission.filter({ status: "approved" });
    const allTransactions = await base44.asServiceRole.entities.CashbackTransaction.list();
    const allClients = await base44.asServiceRole.entities.Client.list();

    // Get payout percentage
    const settings = await base44.asServiceRole.entities.SystemSettings.filter({ setting_key: "payout_settings" });
    const payoutPercent = settings[0]?.payout_percent;
    if (!Number.isFinite(Number(payoutPercent))) {
      return Response.json({ error: 'Payout percentage is not set in Admin → Payout settings.' }, { status: 400 });
    }
    const [defaultLevel] = await base44.asServiceRole.entities.RegistrationLevel.filter({ is_default: true });

    const missingTransactions = [];
    const fixes = [];

    for (const purchase of allPurchases) {
      // Check if this purchase has a corresponding CashbackTransaction
      const hasTransaction = allTransactions.some(t => 
        t.client_id === purchase.client_id &&
        t.transaction_type === 'self_cashback' &&
        t.purchase_amount === purchase.amount
      );

      if (!hasTransaction) {
        // This purchase is missing its cashback transaction
        const client = allClients.find(c => c.id === purchase.client_id);
        
        if (client && client.loyalty_program_enrolled) {
          // Get registration level to determine self cashback percentage
          const regLevels = await base44.asServiceRole.entities.RegistrationLevel.filter({ 
            id: client.registration_level_id 
          });
          const selfCashbackRate = Number((regLevels[0] || defaultLevel)?.self_cashback_percentage) || 0;

          // Calculate cashback amounts
          const totalCashback = purchase.amount * (selfCashbackRate / 100);
          const payoutAmount = (totalCashback * payoutPercent) / 100;
          const cashbackAmount = totalCashback - payoutAmount;

          missingTransactions.push({
            purchaseId: purchase.id,
            receiptNumber: purchase.receipt_number,
            clientId: purchase.client_id,
            clientName: purchase.client_name,
            amount: purchase.amount,
            totalCashback,
            cashbackAmount,
            payoutAmount,
            date: purchase.created_date
          });

          // Create the missing transaction
          await base44.asServiceRole.entities.CashbackTransaction.create({
            client_id: purchase.client_id,
            client_name: purchase.client_name,
            transaction_type: 'self_cashback',
            amount: totalCashback,
            cashback_amount: cashbackAmount,
            payout_amount: payoutAmount,
            purchase_amount: purchase.amount,
            cashback_rate: selfCashbackRate,
            description: `Self-cashback from your own purchase of £${purchase.amount.toFixed(2)}`
          });

          // Update client balances
          await base44.asServiceRole.entities.Client.update(purchase.client_id, {
            cashback_earned: (client.cashback_earned || 0) + cashbackAmount,
            payout_earned: (client.payout_earned || 0) + payoutAmount,
            available_payout: (client.available_payout || 0) + payoutAmount,
            total_payout: (client.total_payout || 0) + payoutAmount
          });

          fixes.push({
            clientName: purchase.client_name,
            receiptNumber: purchase.receipt_number,
            amount: purchase.amount,
            cashbackAdded: cashbackAmount,
            payoutAdded: payoutAmount
          });
        }
      }
    }

    return Response.json({
      success: true,
      missingTransactionsFound: missingTransactions.length,
      fixesApplied: fixes,
      details: missingTransactions
    });

  } catch (error) {
    console.error('Error fixing missing cashback:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
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
