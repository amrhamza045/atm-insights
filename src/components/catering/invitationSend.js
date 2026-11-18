import { base44 } from "@/api/base44Client";
import { passLink } from "./invitationTokens";

export const CHANNELS = {
  email: { label: "Email", field: "email_sent_at", contact: "email" },
  whatsapp: { label: "WhatsApp", field: "whatsapp_sent_at", contact: "phone" },
  sms: { label: "SMS", field: "sms_sent_at", contact: "phone" },
};

/** True once the invitation link has been sent on any channel. */
export function wasSent(inv) {
  return !!(inv.email_sent_at || inv.whatsapp_sent_at || inv.sms_sent_at);
}

export const DEFAULT_EMAIL_SUBJECT = "You're invited: {{event_name}}";

export const DEFAULT_EMAIL_BODY = `Dear {{guest_name}},

You are invited to {{event_name}}.
When: {{when}}
Where: {{where}}
Seats reserved for you: {{seats}}

Please confirm your attendance here:
{{link}}

We look forward to seeing you.`;

export const DEFAULT_EMAIL_SUBJECT_AR = "دعوة: {{event_name}}";

export const DEFAULT_EMAIL_BODY_AR = `عزيزنا {{guest_name}}،

يسعدنا دعوتك إلى {{event_name}}.
الموعد: {{when}}
المكان: {{where}}
عدد المقاعد المحجوزة لك: {{seats}}

يرجى تأكيد حضورك من هنا:
{{link}}

في انتظار تشريفك.`;

function fillTemplate(template, invitation, event) {
  const values = {
    guest_name: invitation.guest_name || "guest",
    event_name: event?.event_name || "our event",
    when: [event?.event_date, event?.start_time].filter(Boolean).join(" · "),
    where: [event?.venue_name, event?.venue_address].filter(Boolean).join(" — "),
    seats: invitation.party_size || 1,
    link: passLink(invitation.token),
  };
  return template.replace(/\{\{(\w+)\}\}/g, (m, key) => (key in values ? String(values[key]) : m));
}

async function loadTemplates(lang = "en") {
  const branding = (await base44.entities.CateringPassBranding.list())[0] || null;
  if (lang === "ar") {
    return {
      subject: branding?.email_subject_ar || DEFAULT_EMAIL_SUBJECT_AR,
      body: branding?.email_body_ar || DEFAULT_EMAIL_BODY_AR,
    };
  }
  return {
    subject: branding?.email_subject || DEFAULT_EMAIL_SUBJECT,
    body: branding?.email_body || DEFAULT_EMAIL_BODY,
  };
}

/** Sends the guest their RSVP link on one channel and stamps the send time. Throws on failure. */
export async function sendInvitation(invitation, event, channel = "email", lang = "en") {
  const config = CHANNELS[channel];
  if (!config) throw new Error("Unknown channel");

  const contact = invitation[config.contact];
  if (!contact) throw new Error(`${invitation.guest_name} has no ${config.contact} on record`);

  const templates = await loadTemplates(lang);
  const message = fillTemplate(templates.body, invitation, event);

  if (channel === "email") {
    await base44.integrations.Core.SendEmail({
      to: contact,
      subject: fillTemplate(templates.subject, invitation, event),
      body: message,
    });
  } else {
    const fn = channel === "whatsapp" ? "sendWhatsAppMessage" : "sendSMS";
    const res = await base44.functions.invoke(fn, { phone_number: contact, message });
    if (res.data?.error) throw new Error(res.data.error);
  }

  await base44.entities.CateringInvitation.update(invitation.id, {
    [config.field]: new Date().toISOString(),
    last_sent_channel: channel,
  });
}

/** Sends to many guests, returning {sent, failed:[names]}. */
export async function sendInvitationsBulk(invitations, event, channel, lang = "en") {
  let sent = 0;
  const failed = [];
  for (const inv of invitations) {
    try {
      await sendInvitation(inv, event, channel, lang);
      sent += 1;
    } catch (err) {
      failed.push(inv.guest_name);
    }
  }
  return { sent, failed };
}