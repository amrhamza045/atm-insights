import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * Reads live from existing source entities only — nothing is copied
 * into any CRM-specific record.
 */
export function useClient360(client, { includeCatering = true } = {}) {
  const clientId = client?.id;

  const events = useQuery({
    queryKey: ["crm-catering-events", clientId],
    queryFn: () => base44.entities.CateringEvent.filter({ client_id: clientId }, "-event_date", 100),
    enabled: !!clientId && includeCatering,
  });

  const lead = useQuery({
    queryKey: ["crm-lead", clientId, client?.email, client?.phone],
    queryFn: async () => {
      // A real converted link always wins over a fuzzy email/phone match.
      const linked = await base44.entities.Lead.filter({ converted_client_id: clientId });
      if (linked[0]) return linked[0];

      const all = await base44.entities.Lead.list("-created_date", 1000);
      const email = (client.email || "").toLowerCase();
      const phone = (client.phone || "").replace(/\D/g, "");
      return (
        all.find((l) => {
          const lEmail = (l.email || "").toLowerCase();
          const lPhone = (l.phone || l.phone_number || "").replace(/\D/g, "");
          return (email && lEmail === email) || (phone && lPhone && lPhone === phone);
        }) || null
      );
    },
    enabled: !!clientId,
  });

  return { events, lead };
}