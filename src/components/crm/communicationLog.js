// Phase H — unified communication timeline.
//
// IMPORTANT (audited 2026-08-10): there is NO entity in this system that stores
// outbound WhatsApp/SMS message records. sendWhatsAppMessage / sendSMS /
// sendOrderStatusWhatsApp post straight to Twilio and return the Twilio SID —
// nothing is persisted. So outbound message *content* cannot be surfaced here;
// it does not exist in our data. See DataGapsNotice usage in the timeline card.
//
// What we CAN legitimately join to a client, read-only:
//   1. ClientInteraction  — manually logged contact (Phase B)
//   2. Notification       — client_id linked, real stored title/message
//   3. Lead (whatsapp)    — INBOUND WhatsApp text, joined by phone number
//   4. CateringInvitation — invitation send events (timestamps only, per channel)
//
// DeliveryMessage is deliberately NOT joined: it is internal staff/driver chat
// with no client linkage at all (no client_id, no phone). Matching it to a
// client would be a fabricated join.

/** Last 10 significant digits — tolerant of "whatsapp:+20...", spaces, dashes, 0/+20 prefixes. */
export function normPhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

function samePhone(a, b) {
  const x = normPhone(a);
  const y = normPhone(b);
  return !!x && x.length >= 8 && x === y;
}

function sameEmail(a, b) {
  const x = String(a || "").trim().toLowerCase();
  const y = String(b || "").trim().toLowerCase();
  return !!x && x === y;
}

const CHANNEL_SENDS = [
  { field: "whatsapp_sent_at", channel: "WhatsApp" },
  { field: "sms_sent_at", channel: "SMS" },
  { field: "email_sent_at", channel: "Email" },
];

/**
 * Merge every client-linked communication source into one chronological list.
 * Pure function — no fetching, no writes.
 */
export function buildCommunicationTimeline({
  client,
  interactions = [],
  notifications = [],
  whatsappLeads = [],
  invitations = [],
}) {
  const events = [];

  for (const i of interactions) {
    events.push({
      id: `int-${i.id}`,
      kind: "interaction",
      at: i.occurred_at || i.created_date,
      body: i.note,
      actor: i.created_by_name || i.created_by_email,
      raw: i,
    });
  }

  for (const n of notifications) {
    events.push({
      id: `notif-${n.id}`,
      kind: "notification",
      label: "Notification",
      sourceLabel: "automated",
      at: n.created_date,
      title: n.title,
      body: n.message,
      raw: n,
    });
  }

  for (const l of whatsappLeads) {
    const matched =
      samePhone(l.phone_number, client?.phone) || samePhone(l.phone, client?.phone);
    if (!matched) continue;
    events.push({
      id: `wa-${l.id}`,
      kind: "whatsapp_in",
      label: "WhatsApp — inbound",
      sourceLabel: "matched by phone",
      at: l.created_date,
      body: l.message_text,
      actor: l.sender_name || l.contact_username,
      raw: l,
    });
  }

  for (const inv of invitations) {
    const matched =
      samePhone(inv.phone, client?.phone) || sameEmail(inv.email, client?.email);
    if (!matched) continue;
    for (const { field, channel } of CHANNEL_SENDS) {
      if (!inv[field]) continue;
      events.push({
        id: `inv-${inv.id}-${field}`,
        kind: "invite_send",
        label: `${channel} — invitation sent`,
        sourceLabel: "automated",
        at: inv[field],
        title: inv.event_name || "Event invitation",
        // Deliberately no body: the send is recorded, the rendered message is not stored.
        body: null,
        raw: inv,
      });
    }
  }

  return events
    .filter((e) => e.at)
    .sort((a, b) => new Date(b.at) - new Date(a.at));
}