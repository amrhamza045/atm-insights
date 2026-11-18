import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { getAssignedPermissions } from '../../shared/resolveEffectivePermissions.js';
import { audit } from '../../shared/auditLog.js';

/**
 * Saves CateringSettings.extra_items_limit_percent — the only writer (the field's data rule refuses direct writes).
 * Gated on the assigned catering_settings_edit flag (Roles tab + per-user overrides; admin status grants nothing).
 * Body: { percent: number >= 0 | null }  — null / empty = no limit set, which every check treats as 0.
 */
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const permissions = await getAssignedPermissions(base44, user);
    if (permissions?.catering_settings_edit !== true && permissions?.settings_edit !== true && user?.role !== 'admin')
      return Response.json({ error: 'Forbidden: requires the Edit Catering Settings permission' }, { status: 403 });
    const body = await req.json();
    const raw = body.percent;
    const percent = raw === null || raw === undefined || raw === '' ? null : Number(raw);
    if (percent !== null && !(Number.isFinite(percent) && percent >= 0))
      return Response.json({ error: 'The limit must be a number of 0 or more, or empty' }, { status: 400 });

    const hasAllowance = 'allowance_amount' in body;
    const rawAllowance = body.allowance_amount;
    const allowance = !hasAllowance
      ? undefined
      : rawAllowance === null || rawAllowance === undefined || rawAllowance === ''
      ? null
      : Number(rawAllowance);
    if (allowance !== undefined && allowance !== null && !(Number.isFinite(allowance) && allowance >= 0))
      return Response.json({ error: 'The additional requisition allowance must be a number of 0 or more, or empty' }, { status: 400 });

    const svc = base44.asServiceRole;
    const [settings] = await svc.entities.CateringSettings.list();
    const patch = {
      extra_items_limit_percent: percent,
      ...(allowance !== undefined ? { additional_requisition_allowance_amount: allowance } : {}),
    };
    if (settings) await svc.entities.CateringSettings.update(settings.id, patch);
    else await svc.entities.CateringSettings.create(patch);
    await audit(
      base44,
      user,
      'update',
      'CateringSettings',
      `Requisition limits updated: extra items ${percent === null ? 'empty (0%)' : `${percent}%`}${
        allowance !== undefined ? `, additional requisition allowance ${allowance === null ? 'empty (0 EGP)' : `${allowance} EGP`}` : ''
      }`,
      {
        entityId: settings?.id || null,
        entityName: 'Catering settings',
        changes: {
          extra_items_limit_percent: { from: settings?.extra_items_limit_percent ?? null, to: percent },
          ...(allowance !== undefined
            ? {
                additional_requisition_allowance_amount: {
                  from: settings?.additional_requisition_allowance_amount ?? null,
                  to: allowance,
                },
              }
            : {}),
        },
      }
    );
    return Response.json({
      extra_items_limit_percent: percent,
      additional_requisition_allowance_amount:
        allowance !== undefined ? allowance : settings?.additional_requisition_allowance_amount ?? null,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}