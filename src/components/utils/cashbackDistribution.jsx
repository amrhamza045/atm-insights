import { base44 } from "@/api/base44Client";

/**
 * Distributes cashback to a client based on system payout percentage
 * Splits the amount between available_payout and cashback_earned
 * Creates a transaction record for tracking
 * @param {string} clientId - The client ID
 * @param {number} cashbackAmount - The total cashback amount to distribute
 * @param {number} payoutPercentage - The payout percentage (e.g., 50 means 50% goes to payout, 50% to cashback)
 * @param {Object} transactionData - Additional transaction details (type, source, description, etc.)
 * @returns {Promise<Object>} Updated client data
 */
export async function distributeCashback(clientId, cashbackAmount, payoutPercentage = 50, transactionData = {}) {
  // Fetch current client data
  const clients = await base44.entities.Client.filter({ id: clientId });
  const client = clients[0];
  
  if (!client) {
    throw new Error("Client not found");
  }
  
  // Skip cashback distribution for customers not enrolled in loyalty program
  if (!client.loyalty_program_enrolled) {
    return {
      client,
      payoutAmount: 0,
      cashbackAmount: 0,
      totalDistributed: 0,
      skipped: true,
      reason: "Customer not enrolled in loyalty program"
    };
  }

  // Calculate splits
  const payoutAmount = (cashbackAmount * payoutPercentage) / 100;
  const cashbackRemaining = cashbackAmount - payoutAmount;

  // Update client with new balances
  const updatedClient = await base44.entities.Client.update(clientId, {
    cashback_earned: (client.cashback_earned || 0) + cashbackRemaining,
    available_payout: (client.available_payout || 0) + payoutAmount,
    total_payout: (client.total_payout || 0) + payoutAmount
  });

  // Create transaction record
  await base44.entities.CashbackTransaction.create({
    client_id: clientId,
    client_name: client.name,
    transaction_type: transactionData.type || "referral_cashback",
    amount: cashbackAmount,
    cashback_amount: cashbackRemaining,
    payout_amount: payoutAmount,
    source_client_id: transactionData.source_client_id,
    source_client_name: transactionData.source_client_name,
    purchase_amount: transactionData.purchase_amount,
    referral_level: transactionData.referral_level,
    cashback_rate: transactionData.cashback_rate,
    description: transactionData.description
  });

  return {
    client: updatedClient,
    payoutAmount,
    cashbackAmount: cashbackRemaining,
    totalDistributed: cashbackAmount
  };
}

/**
 * Gets the system payout percentage setting
 * @returns {Promise<number>} The payout percentage
 */
export async function getPayoutPercentage() {
  const settings = await base44.entities.SystemSettings.filter({ setting_key: "payout_settings" });
  return settings[0]?.payout_percent || 50; // Default to 50% if not set
}

/**
 * Gets the appropriate cashback tier for a client based on their registration level and referral count
 * @param {string} registrationLevelId - The client's registration level ID
 * @param {number} referralCount - Number of direct referrals
 * @returns {Promise<Object>} The matching cashback tier
 */
export async function getCashbackTierForClient(registrationLevelId, referralCount) {
  const allTiers = await base44.entities.CashbackTier.list();
  
  // Filter tiers for this registration level
  const levelsForReg = allTiers.filter(t => t.registration_level_id === registrationLevelId);
  
  if (levelsForReg.length === 0) {
    // Fallback to default tier if no tiers for this registration level
    return allTiers.find(t => t.is_default) || allTiers[0];
  }
  
  // Sort by min_referrals descending
  const sortedTiers = levelsForReg.sort((a, b) => b.min_referrals - a.min_referrals);
  
  // Find the first tier where referralCount >= min_referrals
  const matchingTier = sortedTiers.find(t => referralCount >= t.min_referrals);
  
  return matchingTier || levelsForReg.find(t => t.is_default) || levelsForReg[0];
}

/**
 * Gets the appropriate cashback tier for a client object
 * @param {Object} client - The client object
 * @returns {Promise<Object>} The matching cashback tier
 */
export async function getClientCashbackTier(client) {
  if (!client || !client.registration_level_id) {
    return null;
  }
  
  // Count referrals - referred_by stores EMAIL not ID
  const allClients = await base44.entities.Client.list();
  const referralCount = allClients.filter(c => c.referred_by === client.email).length;
  
  return getCashbackTierForClient(client.registration_level_id, referralCount);
}