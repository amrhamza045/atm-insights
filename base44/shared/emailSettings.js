// Server-side read of EmailNotificationSettings (guests and staff can't read it in the browser).
// These are the Admin › Email switches; an unset switch counts as on.
export const EMAIL_KEYS = [
  // Catering: clients & guests
  "catering_deposit_customer", "rsvp_entry_pass",
  // Catering: kitchen & operations
  "catering_chef_brief", "catering_ops_payment",
  // Catering: sales & management
  "catering_quote_decision", "catering_deposit_recorder", "catering_orphan_scan",
  // Customer accounts & loyalty
  "registration_approved", "tier_upgrade",
];

// Chain of custody emails: their switch is CateringSettings.custody_emails_enabled;
// their Admin › Email recipient choices are stored under this key.
export const CUSTODY_EMAIL_KEY = "custody_emails_enabled";
export const RECIPIENT_KEYS = [...EMAIL_KEYS, CUSTODY_EMAIL_KEY];

// The client, guest or customer always receives these; people added in Admin › Email get a copy.
export const CLIENT_FACING_KEYS = ["catering_deposit_customer", "rsvp_entry_pass", "registration_approved", "tier_upgrade"];

// Names and timing used in audit entries and test emails (same wording as Admin › Email).
export const EMAIL_INFO = {
  catering_deposit_customer: { label: "Deposit receipt", when: "when a deposit payment is completed" },
  rsvp_entry_pass: { label: "Guest entry pass", when: "when a guest confirms attendance on their invitation" },
  catering_chef_brief: { label: "Head Chef kitchen brief", when: "when an event's deposit is fully paid" },
  catering_ops_payment: { label: "Event confirmed & payment alerts", when: "when an event's deposit is fully paid and when later payments are recorded" },
  custody_emails_enabled: { label: "Chain of custody overdue digest", when: "when trip handoffs are overdue" },
  catering_quote_decision: { label: "Client quote decision", when: "when a client accepts or declines a quote in their portal" },
  catering_deposit_recorder: { label: "Deposit copy", when: "when a deposit payment is completed" },
  catering_orphan_scan: { label: "Weekly catering data check", when: "once a week" },
  registration_approved: { label: "Welcome email", when: "when a customer completes their account" },
  tier_upgrade: { label: "Tier upgrade", when: "when a customer reaches a new loyalty tier" },
};

/** Reads the switches once; returns (key) => on. */
export async function loadEmailSwitches(svc) {
  const rows = await svc.entities.EmailNotificationSettings.filter({ setting_key: "email_notifications" });
  const record = rows[0] || {};
  return (key) => record[key] !== false;
}

export async function isEmailEnabled(svc, key) {
  return (await loadEmailSwitches(svc))(key);
}