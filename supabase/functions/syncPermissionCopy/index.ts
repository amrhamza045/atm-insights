import { corsHeaders } from '../_shared/cors.ts';
import {  createClientFromRequest  } from '../_shared/base44Client.ts';
import { syncUsers, usersWithRole } from '../_shared/permissionCopySync.js';
import { getEffectivePermissions } from '../_shared/resolveEffectivePermissions.js';
import { skipUnlessScheduled } from '../_shared/scheduleGate.js';
import { guardScheduledJob, guardRecordJob, callerUser } from '../_shared/jobGuard.js';

const norm = (e) => String(e || '').toLowerCase().trim();

// Trigger for a permission-record change, from which fields changed.
function recordTrigger(eventType, changed = []) {
  if (eventType !== 'update' || changed.includes('role') || changed.includes('is_ex_employee')) return 'role_change';
  if (changed.includes('permission_overrides') || changed.includes('module_overrides')) return 'override';
  if (changed.includes('branch_id')) return 'branch';
  return 'override';
}

// Body: { trigger, user_id? | email? | role_key? | all?, event_type?, changed_fields? }
// Always writes resolver-true values, so it cannot grant anything.
async function handler(req) {
  const base44 = createClientFromRequest(req);
  const svc = base44.asServiceRole;
  let body = await req.json().catch(() => ({}));
  try {
    const skip = await skipUnlessScheduled(svc, body, { hour: 'permission_sync_hour' });
    if (skip && skip.status >= 500) {
      const { error } = await skip.clone().json();
      await logRunFailure(svc, body, error);
    }
    if (skip) return skip;
    const caller = await callerUser(base44);

    // Phase 5: with no user, the nightly all-accounts run is slot-limited and
    // once per slot; single-account / role runs follow the record-change gap.
    // Signed-in schedule ticks get the same once-per-slot guard; manual
    // re-syncs (no scheduled_tick) skip it and are not slot-limited.
    if (body.all && (!caller || body.scheduled_tick === true)) {
      const g = await guardScheduledJob(base44, body, {
        key: 'syncPermissionCopy:nightly',
        slot: { hour: 'permission_sync_hour' },
        authorize: async () => null, // manager check below still applies
        anonymousBody: { trigger: 'nightly', all: true },
      }, caller);
      if (g.skipped) return g.skipped;
      body = g.body;
    }

    // Signed-in non-managers may only sync their own account.
    if (caller && caller.role !== 'admin') {
      const perms = await getEffectivePermissions(base44, caller);
      const self = body.user_id === caller.id || norm(body.email) === norm(caller.email);
      if (!perms.users_manage && !self) return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    let trigger = body.trigger;
    if (trigger === 'permission_record') trigger = recordTrigger(body.event_type, body.changed_fields || []);

    let users = [];
    if (body.all) {
      users = await svc.entities.User.list('-created_date', 1000);
    } else if (body.role_key) {
      users = await usersWithRole(svc, body.role_key);
    } else if (body.user_id) {
      const u = await svc.entities.User.get(body.user_id).catch(() => null);
      if (u) users = [u];
    } else if (body.email) {
      const found = await svc.entities.User.filter({ email: body.email });
      users = found.filter((u) => norm(u.email) === norm(body.email)).slice(0, 1);
    }

    if (!caller && !body.all) {
      const recordId = body.user_id || norm(body.email) || (body.role_key ? `role:${body.role_key}` : '');
      const g = await guardRecordJob(base44, null, {
        key: 'syncPermissionCopy', recordId, recordExists: async () => users.length > 0,
      });
      if (g.skipped) return g.skipped;
    }

    const results = await syncUsers(svc, users, trigger);
    if (!caller) return Response.json({ synced: results.length, failed: results.filter((r) => !r.ok).length });
    return Response.json({
      trigger,
      synced: results.length,
      failed: results.filter((r) => !r.ok),
      mismatched: results.filter((r) => r.mismatch.length).map((r) => ({ email: r.email, fields: r.mismatch })),
    });
  } catch (error) {
    await logRunFailure(svc, body, error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// A run that crashes before any account is synced still leaves a failed log entry.
async function logRunFailure(svc, body, message) {
  await svc.entities.PermissionSyncLog.create({
    user_email: body.email || (body.all ? 'ALL ACCOUNTS' : body.role_key ? `role:${body.role_key}` : null),
    trigger: body.trigger === 'permission_record' ? 'override' : body.trigger || 'manual',
    status: 'failed',
    error_message: String(message).slice(0, 500),
    attempts: 0,
    synced_at: new Date().toISOString(),
  }).catch(() => {});
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
