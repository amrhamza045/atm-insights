import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { loadEmailConfig, sendAndLog } from '../../shared/emailDelivery.js';

// Sends the Head Chef a price-free kitchen brief (email + WhatsApp + in-app)
// once per event, when the deposit becomes paid. mode "status" only reports
// channel configuration. Uses stored data only — caller input is just the id.
const BRIEF_TYPE = 'catering_event_chef_brief';

const normalizePhone = (num) => {
  let n = String(num).replace(/[\s()-]/g, '');
  if (!n.startsWith('+')) n = /^01[0125]\d{8}$/.test(n) ? '+20' + n.substring(1) : '+' + n;
  return n;
};

async function loadChef(svc) {
  // Source of truth: CateringSettings.head_chef_employee_id if configured, else active staff holding the requisition_submit permission (via Role or per-user override).
  const [settingsList, roles, allPerms] = await Promise.all([
    svc.entities.CateringSettings.list(),
    svc.entities.Role.filter({ is_active: true }),
    svc.entities.UserPermissions.list('-created_date', 2000),
  ]);
  const settings = settingsList[0] || null;
  if (settings?.head_chef_employee_id) {
    const configuredEmp = await svc.entities.Employee.get(settings.head_chef_employee_id).catch(() => null);
    if (configuredEmp && configuredEmp.status === 'active') {
      const wa = !!(Deno.env.get('TWILIO_ACCOUNT_SID') && Deno.env.get('TWILIO_AUTH_TOKEN') && Deno.env.get('TWILIO_WHATSAPP_NUMBER'));
      return {
        chef: configuredEmp,
        status: {
          problem: null,
          chef_selected: true,
          chef_name: configuredEmp.name || null,
          email: !!configuredEmp.email?.trim(),
          whatsapp_phone: !!configuredEmp.phone?.trim(),
          whatsapp_service: wa,
          in_app: true,
        },
      };
    }
  }

  const roleByKey = new Map(roles.map((r) => [r.role_key, r]));
  const matchingPerms = allPerms.filter((p) => {
    if (!p || p.is_ex_employee) return false;
    const roleRec = p.role ? roleByKey.get(p.role) : null;
    if (!roleRec) return false;
    const overrides = p.permission_overrides || {};
    const hasSubmit = 'requisition_submit' in overrides ? overrides.requisition_submit === true : roleRec.permissions?.requisition_submit === true;
    return hasSubmit;
  });

  const chefs = [];
  for (const p of matchingPerms) {
    const [emp] = await svc.entities.Employee.filter({ email: p.user_email, status: 'active' });
    if (emp && !chefs.some((c) => c.id === emp.id)) chefs.push(emp);
  }
  const chef = chefs.length === 1 ? chefs[0] : null;
  const problem = chefs.length === 0 ? 'No active employee holds the Chef requisition_submit permission'
    : chefs.length > 1 ? `${chefs.length} active employees hold the Chef requisition_submit permission — configure a primary recipient or keep only one` : null;
  const wa = !!(Deno.env.get('TWILIO_ACCOUNT_SID') && Deno.env.get('TWILIO_AUTH_TOKEN') && Deno.env.get('TWILIO_WHATSAPP_NUMBER'));
  return {
    chef,
    status: {
      problem,
      chef_selected: !!chef,
      chef_name: chef?.name || null,
      email: !!chef?.email?.trim(),
      whatsapp_phone: !!chef?.phone?.trim(),
      whatsapp_service: wa,
      in_app: !!chef,
    },
  };
}

function buildBrief(event, quote) {
  const guests = event.guarantee_locked ? event.guaranteed_guests : event.expected_guests || 0;
  const venue = event.location_type === 'off_site'
    ? [event.venue_name, event.venue_address].filter(Boolean).join(', ')
    : event.branch_name || 'On site';
  const items = (quote?.line_items || []).map((l) =>
    `- ${l.name} × ${l.quantity}${l.kitchen_note ? ` (${l.kitchen_note})` : ''}`);
  const title = `Event confirmed: ${event.event_name} on ${event.event_date}`;
  const text = [
    'The deposit is confirmed. Kitchen brief:',
    `Event: ${event.event_name || ''}`,
    `Date: ${event.event_date || ''}`,
    `Time: ${[event.start_time, event.end_time].filter(Boolean).join(' – ') || '—'}`,
    `Venue: ${venue}`,
    `Headcount: ${guests} persons`,
    '',
    'Menu items:',
    ...(items.length ? items : ['- No quote items recorded']),
  ].join('\n');
  return { title, text };
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));

    if (body.mode === 'status') {
      const user = await base44.auth.me().catch(() => null);
      if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
      return Response.json((await loadChef(svc)).status);
    }

    const event = body.event_id ? await svc.entities.CateringEvent.get(body.event_id).catch(() => null) : null;
    if (!event) return Response.json({ error: 'Event not found' }, { status: 404 });
    if (event.deposit_status !== 'paid' || event.status === 'cancelled') return Response.json({ skipped: 'deposit not paid' });

    const already = await svc.entities.Notification.filter({ entity_type: BRIEF_TYPE, entity_id: event.id });
    if (already.length) return Response.json({ skipped: 'already notified' });

    const { chef, status } = await loadChef(svc);
    if (!chef) return Response.json({ skipped: status.problem, status });

    const quote = event.active_quote_id ? await svc.entities.CateringQuote.get(event.active_quote_id).catch(() => null) : null;
    const { title, text } = buildBrief(event, quote);

    // In-app first: it doubles as the idempotency marker.
    await svc.entities.Notification.create({
      recipient_type: 'employee', employee_id: chef.id, title, message: text,
      type: 'system', entity_type: BRIEF_TYPE, entity_id: event.id, read: false,
    });

    const result = { in_app: true, email: false, email_turned_off: false, whatsapp: false, warnings: [] as string[] };
    // Admin › Email can turn the email copy off or add people; WhatsApp and in-app still go to the Head Chef.
    const config = await loadEmailConfig(svc);
    if (!config.on('catering_chef_brief')) result.email_turned_off = true;
    else {
      if (config.includesDefault('catering_chef_brief') && !status.email) result.warnings.push('Head Chef has no email');
      const to = await config.recipientsFor('catering_chef_brief', status.email ? [chef.email] : []);
      const sent = await sendAndLog(svc, { key: 'catering_chef_brief', to, subject: title, text, context: event.event_name, context_id: event.id });
      result.email = sent.sent.length > 0;
      sent.failures.forEach((f) => result.warnings.push(`Email to ${f.email} failed: ${f.error}`));
    }

    if (status.whatsapp_phone && status.whatsapp_service) {
      const sid = Deno.env.get('TWILIO_ACCOUNT_SID');
      const from = Deno.env.get('TWILIO_WHATSAPP_NUMBER')!;
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${btoa(`${sid}:${Deno.env.get('TWILIO_AUTH_TOKEN')}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          From: from.startsWith('whatsapp:') ? from : `whatsapp:${normalizePhone(from)}`,
          To: `whatsapp:${normalizePhone(chef.phone)}`,
          Body: text,
        }).toString(),
      });
      if (res.ok) result.whatsapp = true;
      else result.warnings.push(`WhatsApp failed: ${(await res.json().catch(() => ({})))?.message || res.status}`);
    } else result.warnings.push(status.whatsapp_phone ? 'WhatsApp service not configured' : 'Head Chef has no phone');

    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}