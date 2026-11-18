import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { loadEmailConfig, sendAndLog } from '../../shared/emailDelivery.js';

/**
 * Guest-facing RSVP endpoint. Guests must be signed in (any account); the
 * invitation token is verified here and only that one record is touched.
 * action: "get" returns the invitation + event summary; "respond" records the reply.
 */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    // Guests sign in first; the token still decides which invitation is opened.
    const user = await base44.auth.me().catch((e) => (e?.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Please sign in to open your invitation' }, { status: 401 });
    const body = await req.json();
    const { token, action = "get", rsvp_status, rsvp_party_size, dietary_notes, guest_message,
      attendee_name, attendee_phone, attendee_email } = body || {};

    if (!token) return Response.json({ error: "Missing invitation token" }, { status: 400 });

    const matches = await base44.asServiceRole.entities.CateringInvitation.filter({ token });
    const invitation = matches[0];
    if (!invitation) return Response.json({ error: "This invitation link is not valid" }, { status: 404 });

    let event = null;
    try {
      event = await base44.asServiceRole.entities.CateringEvent.get(invitation.event_id);
    } catch (e) {
      event = null;
    }

    let record = invitation;

    if (action === "respond") {
      if (!["attending", "declined", "maybe"].includes(rsvp_status)) {
        return Response.json({ error: "Please choose a valid response" }, { status: 400 });
      }
      const confirmed = rsvp_status === "attending"
        ? Math.max(1, Math.min(Number(rsvp_party_size) || 1, invitation.party_size || 1))
        : 0;

      record = await base44.asServiceRole.entities.CateringInvitation.update(invitation.id, {
        rsvp_status,
        rsvp_party_size: confirmed,
        rsvp_date: new Date().toISOString(),
        dietary_notes: dietary_notes || invitation.dietary_notes || "",
        guest_message: guest_message || invitation.guest_message || "",
      });
    }

    if (action === "confirm_attendance") {
      if (!attendee_name || !attendee_phone || !attendee_email) {
        return Response.json({ error: "Name, phone and email are all required" }, { status: 400 });
      }
      const reply = ["attending", "maybe", "declined"].includes(rsvp_status) ? rsvp_status : "attending";
      const attending = reply === "attending";
      const passCode = attending
        ? (invitation.pass_code || `PASS-${token.slice(0, 6).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`)
        : (invitation.pass_code || "");
      record = await base44.asServiceRole.entities.CateringInvitation.update(invitation.id, {
        guest_name: attendee_name,
        phone: attendee_phone,
        email: attendee_email,
        rsvp_status: reply,
        rsvp_party_size: attending ? Math.max(1, invitation.rsvp_party_size || invitation.party_size || 1) : 0,
        rsvp_date: new Date().toISOString(),
        pass_code: passCode,
      });

      // Email the guest their QR entry pass (best-effort — RSVP still succeeds if delivery fails)
      const emailConfig = attending && passCode ? await loadEmailConfig(base44.asServiceRole) : null;
      if (emailConfig?.on("rsvp_entry_pass")) {
        try {
          const when = [event?.event_date, [event?.start_time, event?.end_time].filter(Boolean).join(" – ")]
            .filter(Boolean).join(", ");
          const where = [event?.venue_name, event?.venue_address].filter(Boolean).join(", ");
          const qrImg = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=10&data=${encodeURIComponent(passCode)}`;
          await sendAndLog(base44.asServiceRole, {
            key: "rsvp_entry_pass",
            to: await emailConfig.recipientsFor("rsvp_entry_pass", [attendee_email]),
            context: `${attendee_name} · ${event?.event_name || "event"}`,
            context_id: invitation?.id || "",
            subject: `Your entry pass — ${event?.event_name || "our event"}`,
            body: `
              <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;color:#0f172a">
                <h2 style="text-align:center">You're confirmed, ${attendee_name}!</h2>
                <p style="text-align:center;color:#475569">Show this QR code at the entrance of <strong>${event?.event_name || "the event"}</strong>.</p>
                <div style="text-align:center;padding:24px;border:1px solid #ece4d4;border-radius:16px;margin:16px 0">
                  <img src="${qrImg}" alt="Entry pass QR code" width="220" height="220" style="display:block;margin:0 auto"/>
                  <p style="font-family:monospace;color:#94a3b8;font-size:12px;margin-top:12px">${passCode}</p>
                </div>
                ${when ? `<p><strong>When:</strong> ${when}</p>` : ""}
                ${where ? `<p><strong>Where:</strong> ${where}</p>` : ""}
                <p style="color:#475569">We look forward to seeing you there!</p>
              </div>`,
          });
        } catch (e) {
          // Recipient may not be a registered app user — the pass is still shown on screen
        }
      }
    }

    return Response.json({
      invitation: {
        guest_name: record.guest_name,
        email: record.email || "",
        phone: record.phone || "",
        pass_code: record.pass_code || "",
        party_size: record.party_size || 1,
        rsvp_status: record.rsvp_status || "invited",
        rsvp_party_size: record.rsvp_party_size || 0,
        dietary_notes: record.dietary_notes || "",
        guest_message: record.guest_message || "",
      },
      event: event
        ? {
            event_name: event.event_name,
            organizer: event.branch_name || "",
            event_date: event.event_date,
            start_time: event.start_time || "",
            end_time: event.end_time || "",
            venue_name: event.venue_name || "",
            venue_address: event.venue_address || "",
            dress_code: event.dress_code || "",
            theme: event.theme || "",
          }
        : null,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}