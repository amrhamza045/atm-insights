import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e?.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Please sign in first' }, { status: 401 });
    const body = await req.json();
    const { token, name, company, phone, email, event_type, expected_guests, event_date, notes } = body || {};

    if (!token) return Response.json({ error: 'Missing invitation token' }, { status: 400 });
    if (!name) return Response.json({ error: 'Referral name is required' }, { status: 400 });
    if (!phone && !email) return Response.json({ error: 'Please provide a phone number or an email' }, { status: 400 });

    const invitations = await base44.asServiceRole.entities.CateringInvitation.filter({ token });
    const invitation = invitations[0];
    if (!invitation) return Response.json({ error: 'This invitation link is not valid.' }, { status: 404 });

    // Always read the event's current name — the invitation only holds a snapshot
    let eventName = invitation.event_name || '';
    if (invitation.event_id) {
      const ev = await base44.asServiceRole.entities.CateringEvent.get(invitation.event_id).catch(() => null);
      if (ev?.event_name) eventName = ev.event_name;
    }

    const detailLines = [
      event_type ? 'Event type: ' + event_type : '',
      expected_guests ? 'Expected guests: ' + expected_guests : '',
      event_date ? 'Preferred date: ' + event_date : '',
      notes ? 'Notes: ' + notes : ''
    ].filter(Boolean);

    const lead = await base44.asServiceRole.entities.Lead.create({
      sender_name: name,
      company: company || '',
      phone: phone || '',
      phone_number: phone || '',
      email: email || '',
      brand_purpose: event_type ? 'Catering referral — ' + event_type : 'Catering referral',
      campaign: 'Event pass referral',
      status: 'new',
      referrer_name: invitation.guest_name || '',
      referrer_phone: invitation.phone || '',
      referrer_email: invitation.email || '',
      referrer_event_name: eventName,
      referrer_event_id: invitation.event_id || '',
      message_text: detailLines.join('\n'),
      notes: 'Referral submitted from the event pass by ' + (invitation.guest_name || 'a guest')
    });

    return Response.json({ success: true, lead_id: lead.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}