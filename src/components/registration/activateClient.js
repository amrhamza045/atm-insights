import { base44 } from "@/api/base44Client";
import { brandName } from "@/lib/brandName";
import { calculateClientTier, updateClientTierWithNotification } from "@/components/tierManagement";

/**
 * Activates a registration request by creating the Client record,
 * welcome cashback transaction, tier promotion checks, user invite,
 * and welcome email. Used by both referrer approval (auto) and admin approval.
 *
 * @param {Object} request - The RegistrationRequest record
 * @param {Array} clients - All existing clients (for duplicate/code/tier checks)
 * @param {Array} tiers - CashbackTier list
 * @param {Array} registrationLevels - RegistrationLevel list
 * @returns {Promise<{ referralCode: string, welcomeCashback: number }>}
 */
export async function activateRegistrationRequest(request, clients, tiers, registrationLevels) {
  // Check for duplicate email among loyalty-enrolled clients
  if (request.email) {
    const existingWithEmail = clients.filter(
      c => c.loyalty_program_enrolled && c.email && c.email.toLowerCase().trim() === request.email.toLowerCase().trim()
    );
    if (existingWithEmail.length > 0) {
      throw new Error(`A loyalty client with email "${request.email}" already exists (${existingWithEmail[0].name}). Please reject this request or update the existing client.`);
    }
  }

  // Generate unique referral code: PRO-{initials}-{unique}
  const nameInitials = request.full_name
    .split(" ")
    .filter(w => w.length > 0)
    .map(w => w[0].toUpperCase())
    .join("")
    .substring(0, 3) || "CLI";
  const uniqueId = Math.random().toString(36).substring(2, 6).toUpperCase();
  let referralCode = `PRO-${nameInitials}-${uniqueId}`;

  // Ensure uniqueness by checking existing codes
  const existingCodes = new Set(clients.map(c => c.referral_code));
  while (existingCodes.has(referralCode)) {
    referralCode = `PRO-${nameInitials}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  }

  // Get default tier
  const defaultTier = tiers.find(t => t.is_default) || tiers[0];

  // Get welcome cashback from registration level
  let welcomeCashback = 100; // Default fallback
  if (request.registration_level_id) {
    const level = registrationLevels.find(l => l.id === request.registration_level_id);
    if (level && level.welcome_cashback_amount) {
      welcomeCashback = level.welcome_cashback_amount;
    }
  }

  // Create client record with welcome cashback directly in cashback_earned
  const newClient = await base44.entities.Client.create({
    name: request.full_name,
    email: request.email,
    phone: request.phone,
    referred_by: request.referrer_id,
    referral_code: referralCode,
    status: "active",
    current_tier_id: defaultTier?.id,
    current_tier_name: defaultTier?.level_name,
    cashback_earned: welcomeCashback,
    available_payout: 0,
    total_payout: 0,
    registration_level_id: request.registration_level_id,
    registration_level_name: request.registration_level_name
  });

  // Create welcome cashback transaction record
  await base44.entities.CashbackTransaction.create({
    client_id: newClient.id,
    client_name: newClient.name,
    transaction_type: "welcome_cashback",
    amount: welcomeCashback,
    cashback_amount: welcomeCashback,
    payout_amount: 0,
    description: `Welcome bonus of ${welcomeCashback} EGP for registration`
  });

  // If this client has a referrer, check if referrer (and levels up) should be promoted
  if (request.referrer_id) {
    const referralChain = [];
    let currentReferrerId = request.referrer_id;

    // Build chain of 3 levels up
    for (let i = 0; i < 3; i++) {
      const referrer = clients.find(c => c.id === currentReferrerId);
      if (referrer) {
        referralChain.push(referrer);
        currentReferrerId = referrer.referred_by;
        if (!currentReferrerId) break;
      } else {
        break;
      }
    }

    // Check tier promotion for each level
    for (const referrer of referralChain) {
      const updatedClientsWithNew = [...clients, newClient];
      const newReferrerTier = calculateClientTier(referrer.id, updatedClientsWithNew, tiers, referrer.registration_level_id);
      const oldReferrerTier = tiers.find(t => t.id === referrer.current_tier_id);

      if (newReferrerTier && (!oldReferrerTier || newReferrerTier.id !== oldReferrerTier.id)) {
        await updateClientTierWithNotification(referrer.id, newReferrerTier, oldReferrerTier, referrer);
      }
    }
  }

  // Update request status
  await base44.entities.RegistrationRequest.update(request.id, {
    admin_approved: true,
    referrer_approved: true,
    status: "approved"
  });

  // Invite the user to the app so they can log in via email/password.
  try {
    await base44.users.inviteUser(request.email, "user");
  } catch (inviteError) {
    console.log('Invite skipped (user already exists):', inviteError?.message);
  }

  // Send welcome email
  try {
    await base44.integrations.Core.SendEmail({
      to: request.email,
      from_name: `${brandName()} GenMo`,
      subject: `Welcome to ${brandName()} GenMo! 🎉`,
      body: `
        <h2>Welcome ${request.full_name}!</h2>
        <p>Congratulations! Your ${brandName()} GenMo account has been approved.</p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Your Referral Code</h3>
          <p style="font-size: 24px; font-weight: bold; color: #f59e0b; margin: 10px 0;">${referralCode}</p>
          <p>Share this code with friends and family to earn cashback rewards!</p>
          ${welcomeCashback > 0 ? `
            <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e2e8f0;">
              <p><strong>Welcome Bonus:</strong> ${welcomeCashback.toFixed(2)} EGP added to your cashback balance for rewards!</p>
            </div>
          ` : ''}
        </div>
        
        <h3>How It Works</h3>
        <ul>
          <li>Share your referral code with others</li>
          <li>When they make purchases, you earn cashback based on your tier level</li>
          <li>Redeem your cashback for exclusive rewards</li>
          <li>The more people you refer, the higher your tier and cashback rate!</li>
        </ul>
        
        <p><strong>Current Tier:</strong> ${defaultTier?.level_name || 'Bronze'} - Level 1: ${defaultTier?.cashback_percentage_level1 || defaultTier?.cashback_percentage || 10}%, Level 2: ${defaultTier?.cashback_percentage_level2 || 0}%, Level 3: ${defaultTier?.cashback_percentage_level3 || 0}%</p>
        
        <p style="margin-top: 30px;">Visit our restaurant and enjoy your membership benefits!</p>
        
        <p>Best regards,<br>The ${brandName()} GenMo Team</p>
      `
    });
  } catch (emailError) {
    console.log('Welcome email could not be sent:', emailError);
  }

  // Track approval
  try {
    await base44.analytics.track({
      eventName: "registration_auto_approved",
      properties: {
        request_id: request.id,
        client_name: request.full_name,
        referrer_id: request.referrer_id,
        referral_code: referralCode
      }
    });
  } catch (error) {
    console.error('Analytics tracking failed:', error);
  }

  return { referralCode, welcomeCashback };
}