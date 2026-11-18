import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * Referral figures for one client, computed on the server (other clients'
 * purchase records never reach the browser).
 * view "client"  -> { referrals: {id: {total_spent, cashback_generated, purchase_count}}, referral_cashback: [...] }
 * view "network" -> { purchases: [...trimmed rows] }
 */
export default function useReferralPurchaseStats(clientId, view = "client") {
  return useQuery({
    queryKey: ["referralPurchaseStats", view, clientId],
    queryFn: async () => (await base44.functions.invoke("getReferralPurchaseStats", { view, client_id: clientId })).data,
    enabled: !!clientId
  });
}