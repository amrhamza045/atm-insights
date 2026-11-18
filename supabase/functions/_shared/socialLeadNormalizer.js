// Normalizes incoming social platform webhook payloads into the Lead entity shape.

const PRIORITY_BANDS = [
  { min: 80, label: "Urgent" },
  { min: 60, label: "High" },
  { min: 30, label: "Medium" },
  { min: 0, label: "Low" },
];

export function priorityLabelFor(score) {
  const band = PRIORITY_BANDS.find((b) => score >= b.min);
  return band ? band.label : "Low";
}

function firstValue(obj, keys) {
  for (const k of keys) {
    if (obj && obj[k] !== undefined && obj[k] !== null && obj[k] !== "") return obj[k];
  }
  return undefined;
}

// Meta lead-ads deliver answers as [{ name, values: [...] }]
function flattenFieldData(fieldData) {
  const out = {};
  (fieldData || []).forEach((f) => {
    if (!f || !f.name) return;
    out[f.name] = Array.isArray(f.values) ? f.values[0] : f.values;
  });
  return out;
}

export function normalizeSocialLead(payload = {}) {
  const platform = String(payload.platform || payload.source || "facebook").toLowerCase();

  // A lead-ad style body may nest the answers; merge them up so lookups are flat.
  const flat = {
    ...payload,
    ...flattenFieldData(payload.field_data || payload.fieldData),
    ...(payload.lead || {}),
  };

  const rawPriority = Number(firstValue(flat, ["priority", "score", "lead_score"]) || 0);
  const priority = isNaN(rawPriority) ? 0 : rawPriority;
  const joinedName = [flat.first_name || flat.firstName, flat.last_name || flat.lastName].filter(Boolean).join(" ");

  return {
    platform: ["instagram", "facebook", "linkedin", "whatsapp", "tiktok"].includes(platform)
      ? platform
      : "facebook",
    source: platform,
    brand_purpose:
      firstValue(flat, ["brand_purpose", "purpose", "interest", "brand", "message", "message_text"]) || "",
    priority,
    priority_label: firstValue(flat, ["priority_label"]) || priorityLabelFor(priority),
    contact_username:
      firstValue(flat, ["contact_username", "username", "handle", "screen_name", "from_name", "full_name", "name"]) || "",
    // camelCase names are what Zapier / Make often send (fullName, phoneNumber…)
    sender_name: firstValue(flat, ["full_name", "fullName", "name", "from_name", "sender_name"]) || joinedName,
    company: firstValue(flat, ["company", "company_name", "companyName", "organization", "organisation"]) || "",
    email: firstValue(flat, ["email", "email_address", "emailAddress", "work_email"]) || "",
    phone: firstValue(flat, ["phone", "phone_number", "phoneNumber", "mobile", "whatsapp_number"]) || "",
    phone_number: firstValue(flat, ["phone", "phone_number", "phoneNumber", "mobile"]) || "",
    campaign: firstValue(flat, ["campaign", "campaign_name", "campaignName", "ad_name", "adName", "form_name", "formName", "adgroup"]) || "",
    message_text: firstValue(flat, ["message", "message_text", "text", "comment"]) || "",
    status: "new",
  };
}

export function nextLeadNumber(existingLeads = []) {
  let max = 0;
  existingLeads.forEach((l) => {
    const m = /^LEAD-(\d+)$/.exec(l.lead_number || "");
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });
  return `LEAD-${String(max + 1).padStart(4, "0")}`;
}