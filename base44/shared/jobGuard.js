// Phase 5 — "safe to run with no user" guard for scheduled and record-change jobs.
//
// Signed-in caller: must hold the job's permission. A schedule tick
//   (scheduled_tick) is slot-gated and runs at most once per slot. Any other
//   signed-in call is a manual "Run now": allowed, logged as manual, and it
//   doesn't count against the slot.
// No user: caller input is ignored (the job uses stored data / fixed defaults),
//   it runs only in its configured slot, at most once per slot, and the caller
//   only ever gets back { done } or { skipped } — never data.
import { denyUnlessPermitted } from './requirePermission.js';
import { checkSchedule, skipUnlessScheduled } from './scheduleGate.js';
import { getCompanyOffset } from './companyTimezone.js';

async function callerOf(base44) {
  const authed = await base44.auth.isAuthenticated().catch(() => false);
  return authed ? await base44.auth.me().catch(() => null) : null;
}

const log = (svc, row) =>
  svc.entities.JobRunLog.create({ ...row, ran_at: new Date().toISOString() }).catch(() => {});

async function currentSlotKey(svc) {
  const offset = await getCompanyOffset(svc.entities);
  return new Date(Date.now() + offset * 60000).toISOString().slice(0, 13);
}

// Once per slot: false if a scheduled/no-user run already claimed this hour.
async function claimSlot(svc, jobKey, caller) {
  const slotKey = await currentSlotKey(svc);
  const prior = await svc.entities.JobRunLog.filter({ job_key: jobKey, slot_key: slotKey, outcome: 'done' });
  if (prior.length) return false;
  await log(svc, { job_key: jobKey, slot_key: slotKey, caller, outcome: 'done' });
  return true;
}

// job: { key, permission | authorize(base44, user) => Response|null, slot?: { hour, weekday? }, anonymousBody?: object }
// Returns { denied: Response } | { skipped: Response } | { user, body, anonymous }
export async function guardScheduledJob(base44, raw, job, knownUser) {
  const svc = base44.asServiceRole;
  const user = knownUser !== undefined ? knownUser : await callerOf(base44);

  if (user) {
    const denied = job.authorize ? await job.authorize(base44, user) : await denyUnlessPermitted(base44, user, job.permission);
    if (denied) return { denied };
    if (!job.slot) return { user, body: raw, anonymous: false };
    if (raw?.scheduled_tick !== true) {
      // Manual "Run now": allowed, logged as manual, never counts against the slot.
      await log(svc, { job_key: job.key, slot_key: `manual:${await currentSlotKey(svc)}`, caller: 'user', outcome: 'done', reason: 'manual' });
      return { user, body: raw, anonymous: false };
    }
    // Signed-in schedule tick: slot gate + once per slot.
    const skip = await skipUnlessScheduled(svc, raw, job.slot);
    if (skip) return { skipped: skip };
    if (!(await claimSlot(svc, job.key, 'schedule'))) return { skipped: Response.json({ skipped: true, reason: 'Already ran this slot' }) };
    return { user, body: raw, anonymous: false };
  }

  if (!job.slot) {
    return { skipped: Response.json({ skipped: true, reason: 'Not a scheduled job' }) };
  }
  const gate = await checkSchedule(svc, job.slot);
  if (!gate.run) return { skipped: Response.json({ skipped: true }) };
  if (!(await claimSlot(svc, job.key, 'no_user'))) return { skipped: Response.json({ skipped: true }) };

  return { user: null, body: { ...(job.anonymousBody || {}), scheduled_tick: true }, anonymous: true };
}

// job: { key, permission, recordId, recordExists: async (svc) => boolean }
// Returns { denied } | { skipped } | { user, anonymous }
export async function guardRecordJob(base44, user, job) {
  const svc = base44.asServiceRole;
  if (user) {
    const denied = await denyUnlessPermitted(base44, user, job.permission);
    return denied ? { denied } : { user, anonymous: false };
  }
  if (!job.recordId || !(await job.recordExists(svc))) {
    return { skipped: Response.json({ skipped: true }) };
  }
  const [rec] = await svc.entities.ScheduleSettings.filter({ setting_key: 'schedules' });
  const gapMinutes = Number(rec?.record_job_min_gap_minutes) || 0;
  if (gapMinutes > 0) {
    const [last] = await svc.entities.JobRunLog.filter({ job_key: job.key, slot_key: job.recordId, outcome: 'done' }, '-ran_at', 1);
    if (last && Date.now() - new Date(last.ran_at).getTime() < gapMinutes * 60000) {
      return { skipped: Response.json({ skipped: true }) };
    }
    await log(svc, { job_key: job.key, slot_key: job.recordId, caller: 'no_user', outcome: 'done' });
  }
  return { user: null, anonymous: true };
}

export async function callerUser(base44) {
  return callerOf(base44);
}

// What an anonymous caller is allowed to see.
export const anonymousDone = () => Response.json({ done: true });