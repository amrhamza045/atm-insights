import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { buildCommunicationTimeline } from "./communicationLog";

// Volume at build time (audited 2026-08-10): ClientInteraction 0,
// Notification 437 (all client_id linked), inbound WhatsApp Leads 3,
// CateringInvitation 3. Everything except the invitation/lead pools is queried
// per-client and server-filtered, so nothing scales with total client count.
//
// The two small pools (inbound WhatsApp leads, invitations) have no client_id to
// filter on — they are matched by phone/email in memory — so they are hard-capped
// and shared across the whole CRM by a stable query key, i.e. fetched once per
// session, not once per client opened. If either pool ever grows past a few
// thousand, the correct fix is a client_id (or normalized-phone) field written at
// creation time so it can be server-filtered — not a bigger cap here.
const LEAD_CAP = 500;
const INVITE_CAP = 500;

export function useClientCommunications(client, { enabled = true } = {}) {
  const clientId = client?.id;

  const interactionsQ = useQuery({
    queryKey: ["crm-interactions", clientId],
    queryFn: () =>
      base44.entities.ClientInteraction.filter({ client_id: clientId }, "-occurred_at", 200),
    enabled: enabled && !!clientId,
  });

  const notificationsQ = useQuery({
    queryKey: ["crm-comm-notifications", clientId],
    queryFn: () =>
      base44.entities.Notification.filter({ client_id: clientId }, "-created_date", 200),
    enabled: enabled && !!clientId,
  });

  const leadsQ = useQuery({
    queryKey: ["crm-comm-whatsapp-leads"],
    queryFn: () => base44.entities.Lead.filter({ source: "whatsapp" }, "-created_date", LEAD_CAP),
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  const invitationsQ = useQuery({
    queryKey: ["crm-comm-invitations"],
    queryFn: () => base44.entities.CateringInvitation.list("-created_date", INVITE_CAP),
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  const events = buildCommunicationTimeline({
    client,
    interactions: interactionsQ.data || [],
    notifications: notificationsQ.data || [],
    whatsappLeads: leadsQ.data || [],
    invitations: invitationsQ.data || [],
  });

  return {
    events,
    interactionCount: (interactionsQ.data || []).length,
    isLoading:
      interactionsQ.isLoading || notificationsQ.isLoading || leadsQ.isLoading || invitationsQ.isLoading,
  };
}