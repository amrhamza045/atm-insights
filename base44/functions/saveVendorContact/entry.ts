import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { isSafetyValveEmail } from '../../shared/platformRole.js';
import { audit } from '../../shared/auditLog.js';

// Only the safety-valve account may change the vendor contact details.
export default async function(req) {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user || !isSafetyValveEmail(user.email)) {
    return Response.json({ error: 'Only the safety-valve account can edit vendor details' }, { status: 403 });
  }
  const body = await req.json();
  const clean = (v) => String(v || '').trim();
  const data = {
    support_email: clean(body.email),
    website: clean(body.website),
    mobile: clean(body.mobile),
    updated_by: user.email,
  };
  const svc = base44.asServiceRole.entities.VendorSupportInfo;
  const [rec] = await svc.filter({ setting_key: 'vendor_support' });
  if (rec) await svc.update(rec.id, data);
  else await svc.create({ setting_key: 'vendor_support', ...data });
  await audit(base44, user, rec ? 'update' : 'create', 'VendorSupportInfo', 'Updated the vendor support contact details', {
    entityId: rec?.id, entityName: 'Vendor support',
    changes: Object.fromEntries(['support_email', 'website', 'mobile'].map((k) => [k, { from: rec?.[k] ?? null, to: data[k] }])),
  });
  return Response.json({ ok: true });
}