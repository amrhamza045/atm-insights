import { corsHeaders } from '../_shared/cors.ts';
import {  createClientFromRequest  } from '../_shared/base44Client.ts';
import { denyUnlessPermitted } from '../_shared/requirePermission.js';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Admin-only function
    const denied = await denyUnlessPermitted(base44, user, 'payouts_approve');
    if (denied) return denied;

    // Fetch all completed orders that haven't had cashback generated
    const orders = await base44.entities.Order.filter({
      status: 'completed',
      auto_cashback_generated: false
    });

    const pendingDistributions = [];
    const errors = [];

    for (const order of orders) {
      try {
        // Check eligibility
        if (!order.customer_id) continue;

        // Fetch customer
        const customers = await base44.entities.Client.filter({ 
          id: order.customer_id 
        });
        const customer = customers[0];

        // Skip if customer not enrolled in loyalty program
        if (!customer?.loyalty_program_enrolled) {
          continue;
        }

        // Skip if not eligible order type
        if (!['dine_in', 'takeaway', 'delivery'].includes(order.order_type)) {
          continue;
        }

        // Skip third-party delivery (delivery_company_name exists and is not direct)
        if (order.order_type === 'delivery' && order.delivery_company_id) {
          const deliveryCompanies = await base44.entities.DeliveryCompany.filter({
            id: order.delivery_company_id
          });
          const deliveryCompany = deliveryCompanies[0];
          
          // Skip if it's a third-party delivery company (not own direct delivery)
          if (deliveryCompany && deliveryCompany.name && deliveryCompany.name.toLowerCase().includes('talabat')) {
            continue;
          }
        }

        // Calculate self-cashback (customer's own purchase)
        let customerCashbackAmount = 0;
        let referralCashbackDetails = [];

        // Get customer's cashback tier
        const allTiers = await base44.entities.CashbackTier.filter({
          registration_level_id: customer.registration_level_id
        });

        // Count customer's direct referrals
        const allClients = await base44.entities.Client.list();
        const referralCount = allClients.filter(c => c.referred_by === customer.email).length;

        // Find matching tier
        const sortedTiers = allTiers.sort((a, b) => b.min_referrals - a.min_referrals);
        const tier = sortedTiers.find(t => referralCount >= t.min_referrals) || sortedTiers[0];

        // Calculate self-cashback if tier has it (no payout split — all goes to cashback_earned)
        if (tier?.self_cashback_percentage > 0) {
          customerCashbackAmount = (order.total * tier.self_cashback_percentage) / 100;
        }

        // Calculate referral cashback (up to 3 levels)
        if (customer.referred_by) {
          let currentReferrerId = customer.referred_by;
          let level = 1;

          while (currentReferrerId && level <= 3) {
            const referrers = await base44.entities.Client.filter({
              email: currentReferrerId
            });
            const referrer = referrers[0];

            if (!referrer || !referrer.loyalty_program_enrolled) break;

            // Get referrer's tier
            const referrerTiers = await base44.entities.CashbackTier.filter({
              registration_level_id: referrer.registration_level_id
            });

            const referrerReferralCount = allClients.filter(
              c => c.referred_by === referrer.email
            ).length;

            const sortedReferrerTiers = referrerTiers.sort(
              (a, b) => b.min_referrals - a.min_referrals
            );
            const referrerTier = sortedReferrerTiers.find(
              t => referrerReferralCount >= t.min_referrals
            ) || sortedReferrerTiers[0];

            // Get cashback rate for this level
            let cashbackRate = 0;
            if (level === 1 && referrerTier?.cashback_percentage_level1) {
              cashbackRate = referrerTier.cashback_percentage_level1;
            } else if (level === 2 && referrerTier?.cashback_percentage_level2) {
              cashbackRate = referrerTier.cashback_percentage_level2;
            } else if (level === 3 && referrerTier?.cashback_percentage_level3) {
              cashbackRate = referrerTier.cashback_percentage_level3;
            }

            if (cashbackRate > 0) {
              const referralCashback = (order.total * cashbackRate) / 100;
              referralCashbackDetails.push({
                referrer_id: referrer.id,
                referrer_name: referrer.name,
                referral_level: level,
                cashback_amount: referralCashback,
                cashback_rate: cashbackRate
              });
            }

            currentReferrerId = referrer.referred_by;
            level++;
          }
        }

        // Create pending distribution record if there's any cashback
        const totalCashback = customerCashbackAmount + 
          referralCashbackDetails.reduce((sum, r) => sum + r.cashback_amount, 0);

        if (totalCashback > 0) {
          const pending = await base44.entities.CashbackDistributionPending.create({
            order_id: order.id,
            customer_id: customer.id,
            customer_name: customer.name,
            order_total: order.total,
            order_type: order.order_type,
            payment_method: order.payment_method,
            cashback_amount: totalCashback,
            cashback_to_customer: customerCashbackAmount,
            payout_to_customer: 0,
            referral_cashback_details: referralCashbackDetails,
            status: 'pending_approval'
          });

          pendingDistributions.push(pending);
        }
      } catch (error) {
        errors.push({
          order_id: order.id,
          error: error.message
        });
      }
    }

    return Response.json({
      success: true,
      pendingDistributions: pendingDistributions.length,
      message: `Generated ${pendingDistributions.length} pending cashback distributions`,
      errors: errors.length > 0 ? errors : null
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
