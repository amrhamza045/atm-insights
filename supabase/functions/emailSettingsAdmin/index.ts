import { corsHeaders } from '../_shared/cors.ts';
import {  createClientFromRequest  } from '../_shared/base44Client.ts';
import { denyUnlessPermitted } from '../_shared/requirePermission.js';
import { usersWithPermission } from '../_shared/permissionRecipients.js';
import { opsKitchenStaff } from '../_shared/cateringEmailRecipients.js';
import { audit } from '../_shared/auditLog.js';
import { loadBrandName } from '../_shared/brand.js';
import { RECIPIENT_KEYS } from '../_shared/emailSettings.js';
import { loadEmailConfig, sendAndLog } from '../_shared/emailDelivery.js';
import { buildEmailSettingsPatch, buildTestEmail } from '../_shared/emailAdmin.js';

const SETTING_KEY = 'email_notifications';
const TESTS_PER_HOUR = 10;

/**
 * Admin › Email.
 * "status": who the staff emails reach right now, and the employees that can be chosen.
 * "save": { switches, recipients } saves switch and recipient changes (validated, audited).
 * "send_test": { key, target: "me" | "added" } sends a short test email and logs it.
 * "set_head_chef": { employee_id } saves the Head Chef (empty = the Chef-permission fallback).
 */
async function handler(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    const body = await req.json().catch(() => ({}));
    const svc = base44.asServiceRole;
    // Same people the settings record lets in: admins, central admins and Settings editors.
    const editorDenied = () => (user?.perm_is_central_admin === true ? null : denyUnlessPermitted(base44, user, ['settings_edit']));

    if (body.action === 'set_head_chef') {
      const denied = await denyUnlessPermitted(base44, user, ['catering_settings_edit', 'settings_edit']);
      if (denied) return denied;
      const employeeId = typeof body.employee_id === 'string' ? body.employee_id.trim() : '';
      let employee = null;
      if (employeeId) {
        employee = await svc.entities.Employee.get(employeeId).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
        if (!employee || employee.status !== 'active') {
          return Response.json({ error: 'Choose an active employee' }, { status: 400 });
        }
      }
      const [settings] = await svc.entities.CateringSettings.list();
      const before = settings?.head_chef_employee_id || '';
      if (settings) await svc.entities.CateringSettings.update(settings.id, { head_chef_employee_id: employeeId });
      else await svc.entities.CateringSettings.create({ head_chef_employee_id: employeeId });
      await audit(base44, user, 'update', 'CateringSettings',
        employee ? `Head Chef for kitchen briefs set to ${employee.name || employee.email}` : 'Head Chef for kitchen briefs cleared', {
          entityId: settings?.id || null,
          entityName: 'Catering settings',
          changes: { head_chef_employee_id: { from: before, to: employeeId } },
        });
      return Response.json({ head_chef_employee_id: employeeId });
    }

    if (body.action === 'save') {
      const denied = await editorDenied();
      if (denied) return denied;
      const [[record], employees] = await Promise.all([
        svc.entities.EmailNotificationSettings.filter({ setting_key: SETTING_KEY }),
        svc.entities.Employee.list('name', 1000),
      ]);
      const result = buildEmailSettingsPatch(record, body, new Set(employees.map((e) => e.id)));
      if (result.error) return Response.json({ error: result.error }, { status: 400 });
      if (!Object.keys(result.patch).length) return Response.json({ saved: false });
      if (record) await svc.entities.EmailNotificationSettings.update(record.id, result.patch);
      else await svc.entities.EmailNotificationSettings.create({ setting_key: SETTING_KEY, ...result.patch });
      await audit(base44, user, 'update', 'EmailNotificationSettings', `Admin › Email: ${result.summary.join('; ')}`, {
        entityId: record?.id || null,
        entityName: 'Email notifications',
        changes: result.changes,
      });
      return Response.json({ saved: true });
    }

    if (body.action === 'send_test') {
      const denied = await editorDenied();
      if (denied) return denied;
      if (!RECIPIENT_KEYS.includes(body.key)) return Response.json({ error: 'Unknown email' }, { status: 400 });
      if (body.target !== 'me' && body.target !== 'added') return Response.json({ error: 'Unknown test target' }, { status: 400 });
      const hourAgo = new Date(Date.now() - 3600_000).toISOString();
      const recent = await svc.entities.EmailSendLog.filter(
        { is_test: true, triggered_by: user.email, created_date: { $gte: hourAgo } }, '-created_date', TESTS_PER_HOUR);
      if (recent.length >= TESTS_PER_HOUR) {
        return Response.json({ error: `You've sent ${TESTS_PER_HOUR} tests in the last hour. Try again later.` }, { status: 429 });
      }
      const config = await loadEmailConfig(svc);
      const to = body.target === 'me' ? [user.email] : await config.recipientsFor(body.key, []);
      if (!to.length) return Response.json({ error: 'No one who can receive it is added to this email yet' }, { status: 400 });
      const email = buildTestEmail(body.key, await loadBrandName(base44, 'our team'), body.target === 'added');
      const result = await sendAndLog(svc, {
        key: body.key, to, ...email,
        context: body.target === 'me' ? 'Test sent to me' : 'Test sent to added people',
        is_test: true, triggered_by: user.email,
      });
      return Response.json({ sent: result.sent, failures: result.failures });
    }

    if (body.action !== 'status') return Response.json({ error: 'Unknown action' }, { status: 400 });
    const denied = await denyUnlessPermitted(base44, user, ['admin_settings', 'settings_edit']);
    if (denied) return denied;

    const [approvers, employees] = await Promise.all([
      usersWithPermission(svc, 'catering_approve'),
      svc.entities.Employee.list('name', 1000),
    ]);
    const person = (e) => ({
      id: e.id,
      name: e.name || e.email || 'Unnamed employee',
      email: e.email?.trim() || '',
      department: e.department || '',
      position: e.position || '',
      active: e.status === 'active',
    });
    return Response.json({
      approvers: approvers.map((u) => ({ name: u.full_name || u.email, email: u.email })),
      operations: opsKitchenStaff(employees).map(person),
      employees: employees.map(person),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  try {
    const res = await handler(req);
    const newHeaders = new Headers(res.headers);
    for (const [k, v] of Object.entries(corsHeaders)) {
      newHeaders.set(k, v);
    }
    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: newHeaders,
    });
  } catch (err: any) {
    return Response.json({ error: err.message || String(err) }, {
      status: 500,
      headers: corsHeaders,
    });
  }
});
