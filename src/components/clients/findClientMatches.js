// Shared duplicate-client lookup used by every client-creation form.
// Read-only: it never writes, it only surfaces existing records that look like the same person.
import { normPhone, normEmail } from "@/components/crm/duplicateDetection";

/**
 * Returns existing client records whose phone or email matches what staff just typed.
 * Archived (merged-away) records are ignored, as is the record being edited.
 */
export function findClientMatches(clients = [], { phone, email, excludeId } = {}) {
  const p = normPhone(phone);
  const e = normEmail(email);
  if (p.length < 6 && !e) return [];

  return clients.filter((c) => {
    if (c.is_merged || (excludeId && c.id === excludeId)) return false;
    const phoneHit = p.length >= 6 && normPhone(c.phone) === p;
    const emailHit = !!e && normEmail(c.email) === e;
    return phoneHit || emailHit;
  });
}

export function matchReason(client, { phone, email } = {}) {
  const p = normPhone(phone);
  const e = normEmail(email);
  const hits = [];
  if (p.length >= 6 && normPhone(client.phone) === p) hits.push("same phone");
  if (e && normEmail(client.email) === e) hits.push("same email");
  return hits.join(" · ");
}