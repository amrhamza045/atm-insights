import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { denyUnlessPermitted } from '../../shared/requirePermission.js';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    const denied = await denyUnlessPermitted(base44, user, 'purchases_approve');
    if (denied) return denied;

    const body = await req.json();
    const { purchaseReceiptNumber } = body;

    if (!purchaseReceiptNumber) {
      return Response.json({ error: 'Receipt number required' }, { status: 400 });
    }

    // Get the purchase submission
    const submissions = await base44.entities.PurchaseSubmission.filter({ 
      receipt_number: purchaseReceiptNumber 
    });
    const submission = submissions[0];

    if (!submission) {
      return Response.json({ error: 'Purchase not found' }, { status: 404 });
    }

    // Get all clients
    const allClients = await base44.entities.Client.list();
    const client = allClients.find(c => c.id === submission.client_id);

    if (!client) {
      return Response.json({ error: 'Client not found' }, { status: 404 });
    }

    // Get all registration levels
    const registrationLevels = await base44.entities.RegistrationLevel.list();

    // Get payout percentage
    const settings = await base44.entities.SystemSettings.filter({ setting_key: "payout_settings" });
    const payoutPercentage = settings[0]?.payout_percent;
    if (!Number.isFinite(Number(payoutPercentage))) {
      return Response.json({ error: 'Payout percentage is not set in Admin → Payout settings.' }, { status: 400 });
    }

    // Get all cashback tiers
    const allTiers = await base44.entities.CashbackTier.list();

    // Build referral chain
    const referralChain = [];
    let currentClient = client;

    for (let level = 1; level <= 3; level++) {
      if (currentClient.referred_by) {
        // referred_by can be either ID or email, try ID first
        let referrer = allClients.find(c => c.id === currentClient.referred_by);
        if (!referrer) {
          referrer = allClients.find(c => c.email === currentClient.referred_by);
        }
        
        if (referrer) {
          referralChain.push({ level, referrer });
          currentClient = referrer;
        } else {
          break;
        }
      } else {
        break;
      }
    }

    // Check existing distributions
    const existingTransactions = await base44.entities.CashbackTransaction.filter({});
    const purchaseTransactions = existingTransactions.filter(t => 
      t.source_client_id === client.id && 
      Math.abs(new Date(t.created_date).getTime() - new Date(submission.created_date).getTime()) < 60000 // Within 1 minute
    );

    const distributedLevels = new Set(purchaseTransactions.map(t => t.referral_level));

    // Distribute missing cashback
    const missingDistributions = [];

    for (const { level, referrer } of referralChain) {
      if (distributedLevels.has(level)) {
        continue; // Already distributed
      }

      // Get referrer's direct referrals count (by ID or email)
      const referrerDirectReferrals = allClients.filter(c => 
        c.referred_by === referrer.id || c.referred_by === referrer.email
      );

      // Get appropriate tier
      const levelsForReg = allTiers.filter(t => t.registration_level_id === referrer.registration_level_id);
      const sortedTiers = levelsForReg.sort((a, b) => b.min_referrals - a.min_referrals);
      const tier = sortedTiers.find(t => referrerDirectReferrals.length >= t.min_referrals) || 
                   levelsForReg.find(t => t.is_default) || 
                   levelsForReg[0] ||
                   allTiers.find(t => t.is_default);

      let cashbackRate = 0;
      if (tier) {
        if (level === 1) cashbackRate = tier.cashback_percentage_level1 || tier.cashback_percentage || 0;
        else if (level === 2) cashbackRate = tier.cashback_percentage_level2 || 0;
        else if (level === 3) cashbackRate = tier.cashback_percentage_level3 || 0;
      }

      const cashbackEarned = submission.amount * (cashbackRate / 100);

      if (cashbackEarned > 0) {
        // Calculate split
        const payoutAmount = (cashbackEarned * payoutPercentage) / 100;
        const cashbackRemaining = cashbackEarned - payoutAmount;

        // Update referrer
        await base44.asServiceRole.entities.Client.update(referrer.id, {
          cashback_earned: (referrer.cashback_earned || 0) + cashbackRemaining,
          available_payout: (referrer.available_payout || 0) + payoutAmount,
          total_payout: (referrer.total_payout || 0) + payoutAmount
        });

        // Create transaction record
        await base44.asServiceRole.entities.CashbackTransaction.create({
          client_id: referrer.id,
          client_name: referrer.name,
          transaction_type: "referral_cashback",
          amount: cashbackEarned,
          cashback_amount: cashbackRemaining,
          payout_amount: payoutAmount,
          source_client_id: client.id,
          source_client_name: client.name,
          purchase_amount: submission.amount,
          referral_level: level,
          cashback_rate: cashbackRate,
          description: `Referral cashback from ${client.name}'s purchase (Level ${level}) - Fixed/Verified`
        });

        // Create purchase record
        await base44.asServiceRole.entities.Purchase.create({
          client_id: client.id,
          client_name: client.name,
          amount: submission.amount,
          cashback_earned: cashbackEarned,
          referrer_id: referrer.id,
          referrer_name: referrer.name,
          cashback_rate: cashbackRate
        });

        missingDistributions.push({
          level,
          referrer: referrer.name,
          cashbackRate,
          cashbackAmount: cashbackEarned,
          payoutAmount,
          cashbackRemaining
        });
      }
    }

    return Response.json({
      success: true,
      purchase: {
        receiptNumber: submission.receipt_number,
        clientName: client.name,
        amount: submission.amount
      },
      referralChain: referralChain.map(r => ({ level: r.level, name: r.referrer.name })),
      alreadyDistributed: Array.from(distributedLevels).sort(),
      missingDistributions,
      totalLevels: referralChain.length
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});