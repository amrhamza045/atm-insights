import { base44 } from "@/api/base44Client";

/** Formal pipeline. "closed" is legacy and is displayed inside the Lost column. */
export const PIPELINE_STAGES = [
  { value: "new", label: "New", accent: "bg-slate-100 text-slate-700" },
  { value: "contacted", label: "Contacted", accent: "bg-blue-100 text-blue-700" },
  { value: "qualified", label: "Qualified", accent: "bg-amber-100 text-amber-700" },
  { value: "converted", label: "Converted", accent: "bg-green-100 text-green-700" },
  { value: "lost", label: "Lost", accent: "bg-red-100 text-red-700" },
];

export const stageOf = (lead) => (lead.status === "closed" ? "lost" : lead.status || "new");

export const leadName = (lead) =>
  lead.sender_name || lead.contact_username || lead.company || lead.lead_number || "Unnamed lead";

const digits = (v) => (v || "").replace(/\D/g, "");

/** Same matching rule the 360° view uses: email match, or phone match on digits only. */
export function findMatchingClient(lead, clients) {
  const email = (lead.email || "").toLowerCase();
  const phone = digits(lead.phone || lead.phone_number);
  return (
    clients.find((c) => {
      const cEmail = (c.email || "").toLowerCase();
      const cPhone = digits(c.phone);
      return (email && cEmail === email) || (phone && cPhone && cPhone === phone);
    }) || null
  );
}

/**
 * Deliberate staff action only. Links to an existing client when one matches,
 * otherwise creates a new one, then stamps the lineage back onto the lead.
 */
export async function convertLead({ lead, existingClient, currentUser }) {
  let client = existingClient;
  const mode = existingClient ? "linked_existing" : "created_new";

  if (!client) {
    client = await base44.entities.Client.create({
      name: leadName(lead),
      email: lead.email || undefined,
      phone: lead.phone || lead.phone_number || undefined,
      client_source: lead.platform || lead.source || undefined,
    });
  }

  await base44.entities.Lead.update(lead.id, {
    status: "converted",
    converted_client_id: client.id,
    converted_client_name: client.name,
    converted_date: new Date().toISOString(),
    converted_by_email: currentUser?.email,
    conversion_mode: mode,
  });

  return { client, mode };
}