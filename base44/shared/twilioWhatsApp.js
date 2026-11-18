// Sends one WhatsApp message (optionally a document/media message, where `message`
// becomes the caption) through Twilio. Callers decide who may send before calling this.

// Normalize phone numbers to E.164.
const normalize = (num) => {
  let n = String(num).replace(/[\s()-]/g, '');
  if (!n.startsWith('+')) {
    // Egyptian local numbers: convert 01xxxxxxxxx → +201xxxxxxxxx
    n = /^01[0125]\d{8}$/.test(n) ? '+20' + n.substring(1) : '+' + n;
  }
  return n;
};

export async function sendWhatsApp({ phone_number, message, media_url }) {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const fromNumber = Deno.env.get('TWILIO_WHATSAPP_NUMBER');
  const missing = [!accountSid && 'TWILIO_ACCOUNT_SID', !authToken && 'TWILIO_AUTH_TOKEN', !fromNumber && 'TWILIO_WHATSAPP_NUMBER'].filter(Boolean);
  if (missing.length) {
    return { ok: false, status: 500, body: { error: `WhatsApp is not configured — missing ${missing.join(', ')}` } };
  }

  const from = fromNumber.startsWith('whatsapp:') ? fromNumber : `whatsapp:${normalize(fromNumber)}`;
  const body = new URLSearchParams({ From: from, To: `whatsapp:${normalize(phone_number)}` });
  if (message) body.set('Body', message);
  if (media_url) body.set('MediaUrl', media_url);

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
    signal: AbortSignal.timeout(15000),
  });
  const result = await response.json();
  if (!response.ok) {
    return { ok: false, status: 500, body: { error: 'Failed to send WhatsApp message', details: result } };
  }
  return { ok: true, status: 200, body: { success: true, message_id: result.sid, status: result.status || 'sent' } };
}