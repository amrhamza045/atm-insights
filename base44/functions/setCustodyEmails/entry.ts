import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { denyUnlessPermitted } from '../../shared/requirePermission.js';
import { audit } from '../../shared/auditLog.js';

/**
 * Equipment tab: pause or resume every custody chain email. Catering settings are
 * admin-only to write, so this one setting goes through here, gated on catering_view
 * (everyone who uses the Equipment tab). Body: { enabled: boolean }.
 */
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    const denied = await denyUnlessPermitted(base44, user, 'catering_view');
    if (denied) return denied;
    const { enabled } = await req.json();
    if (typeof enabled !== 'boolean') return Response.json({ error: 'enabled must be true or false' }, { status: 400 });

    const svc = base44.asServiceRole;
    const [settings] = await svc.entities.CateringSettings.list();
    if (settings) await svc.entities.CateringSettings.update(settings.id, { custody_emails_enabled: enabled });
    else await svc.entities.CateringSettings.create({ custody_emails_enabled: enabled });

    await audit(base44, user, 'update', 'CateringSettings', `Custody emails ${enabled ? 'resumed' : 'stopped'} from the Equipment tab`, {
      entityId: settings?.id || null,
      entityName: 'Catering settings',
      changes: { custody_emails_enabled: { from: settings ? settings.custody_emails_enabled !== false : true, to: enabled } },
    });
    return Response.json({ custody_emails_enabled: enabled });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}