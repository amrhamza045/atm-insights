// Sends one SMS through Twilio. Callers decide who may send before calling this.
export async function sendViaTwilio(phone_number, message) {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const twilioNumber = Deno.env.get('TWILIO_PHONE_NUMBER');
  if (!accountSid || !authToken || !twilioNumber) {
    return { ok: false, status: 500, body: { error: 'SMS service not configured' } };
  }
  const formData = new URLSearchParams();
  formData.append('To', phone_number);
  formData.append('From', twilioNumber);
  formData.append('Body', message);
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    return { ok: false, status: 500, body: { error: 'Failed to send SMS', details: await response.text() } };
  }
  const result = await response.json();
  return { ok: true, status: 200, body: { success: true, sent: true, message_sid: result.sid, status: result.status } };
}