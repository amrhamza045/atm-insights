import { base44 } from "@/api/base44Client";

export const calculateClientTier = (clientId, clients, tiers, registrationLevelId) => {
  const directReferrals = clients.filter(c => c.referred_by === clientId);
  
  // Filter tiers for this registration level
  const levelsForReg = tiers.filter(t => t.registration_level_id === registrationLevelId);
  
  if (levelsForReg.length === 0) {
    // Fallback to default tier if no tiers for this registration level
    return tiers.find(t => t.is_default);
  }
  
  const sortedTiers = [...levelsForReg].sort((a, b) => b.min_referrals - a.min_referrals);
  return sortedTiers.find(t => directReferrals.length >= t.min_referrals) || 
         levelsForReg.find(t => t.is_default) || 
         levelsForReg[0];
};

export const updateClientTierWithNotification = async (clientId, newTier, oldTier, client) => {
  if (!newTier) return;

  await base44.entities.Client.update(clientId, {
    current_tier_id: newTier.id,
    current_tier_name: newTier.level_name
  });

  // Notify client of tier change if upgraded (email only, no extra API calls)
  if (oldTier && newTier.id !== oldTier.id && newTier.cashback_percentage_level1 > (oldTier.cashback_percentage_level1 || 0)) {
    if (client?.email) {
      // Built and sent on the server (Admin › Email decides if it goes and who gets a copy)
      await base44.functions.invoke("sendAccountEmail", { type: "tier_upgrade", client_id: clientId, previous_tier_id: oldTier.id })
        .catch((e) => console.error("Tier upgrade email could not be sent:", e));
    }
  }
};

export const evaluateAndUpdateAllTiers = async (clients, tiers) => {
  const tierUpdates = [];

  for (const client of clients) {
    const newTier = calculateClientTier(client.id, clients, tiers, client.registration_level_id);
    const oldTier = tiers.find(t => t.id === client.current_tier_id);

    if (newTier && (!oldTier || newTier.id !== oldTier.id)) {
      tierUpdates.push({ clientId: client.id, newTier, oldTier, client });
    }
  }

  // Apply all tier updates
  for (const { clientId, newTier, oldTier, client } of tierUpdates) {
    await updateClientTierWithNotification(clientId, newTier, oldTier, client);
  }

  return tierUpdates.length > 0;
};