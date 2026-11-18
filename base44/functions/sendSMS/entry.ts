import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { denyUnlessPermitted } from '../../shared/requirePermission.js';
import { sendViaTwilio } from '../../shared/twilioSms.js';

// Preference flags a caller may ask the server to honour. The caller never sees
// the preference record — the server reads it and decides whether to send.
const ALLOWED_PREFERENCE_KEYS = ['order_confirmations', 'delivery_assignments', 'promotional_messages'];

// Staff only (POS order texts, Admin test texts): never an open text relay.
const SMS_SENDERS = ['cashier_edit', 'pos_view', 'cashier_view', 'delivery_view', 'admin_settings', 'admin_operations',
  'admin_systems', 'settings_edit', 'inventory_edit'];

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const denied = await denyUnlessPermitted(base44, user, SMS_SENDERS);
    if (denied) return denied;

    const { phone_number, message, recipient_user_id, recipient_email, preference_key } = await req.json();
    if (!message) return Response.json({ error: 'Message is required' }, { status: 400 });

    // Preference-gated mode: look up the recipient's SMS preferences server-side.
    if (preference_key) {
      if (!ALLOWED_PREFERENCE_KEYS.includes(preference_key)) {
        return Response.json({ error: 'Unknown preference key' }, { status: 400 });
      }
      if (!recipient_user_id && !recipient_email) {
        return Response.json({ error: 'A recipient is required' }, { status: 400 });
      }
      const query = recipient_user_id ? { user_id: recipient_user_id } : { user_email: recipient_email };
      const prefs = (await base44.asServiceRole.entities.SMSNotificationPreferences.filter(query))[0];
      if (!prefs?.[preference_key] || !prefs?.phone_number) {
        return Response.json({ success: true, sent: false, reason: 'recipient_opted_out_or_no_phone' });
      }
      const out = await sendViaTwilio(prefs.phone_number, message);
      return Response.json(out.body, { status: out.status });
    }

    // Direct mode (existing callers that already hold a phone number).
    if (!phone_number) {
      return Response.json({ error: 'Phone number and message are required' }, { status: 400 });
    }
    const out = await sendViaTwilio(phone_number, message);
    return Response.json(out.body, { status: out.status });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}