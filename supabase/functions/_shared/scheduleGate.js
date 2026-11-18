// Scheduled jobs fire every hour; this gate decides whether the current hour
// (in the company timezone) is the one saved in Admin → Settings → Schedules.
import { getCompanyOffset, TIMEZONE_MISSING } from './companyTimezone.js';

// job: { hour: field name, weekday?: field name }
export async function checkSchedule(svc, job) {
  const [rec] = await svc.entities.ScheduleSettings.filter({ setting_key: 'schedules' });
  const hour = rec?.[job.hour];
  if (hour === null || hour === undefined) return { run: false, reason: `Schedule "${job.hour}" is not set in Admin → Settings → Schedules.` };
  const offset = await getCompanyOffset(svc.entities);
  if (offset === null) return { run: false, reason: TIMEZONE_MISSING };
  const local = new Date(Date.now() + offset * 60000);
  if (local.getUTCHours() !== Number(hour)) return { run: false, reason: 'Not the scheduled hour' };
  if (job.weekday) {
    const day = rec?.[job.weekday];
    if (day === null || day === undefined) return { run: false, reason: `Schedule "${job.weekday}" is not set.` };
    if (local.getUTCDay() !== Number(day)) return { run: false, reason: 'Not the scheduled day' };
  }
  return { run: true };
}

// Numeric job settings (same record). Throws a clear message when one is missing.
export async function getJobNumber(svc, field) {
  const [rec] = await svc.entities.ScheduleSettings.filter({ setting_key: 'schedules' });
  const v = rec?.[field];
  if (v === null || v === undefined || !Number.isFinite(Number(v))) {
    throw new Error(`Setting "${field}" is not set in Admin → Settings → Timezone → Automatic job settings.`);
  }
  return Number(v);
}

// Returns a skip Response when a scheduled tick is outside its slot, else null.
export async function skipUnlessScheduled(svc, body, job) {
  if (!body?.scheduled_tick) return null;
  const gate = await checkSchedule(svc, job);
  if (gate.run) return null;
  // Missing configuration is a failure (shows as failed in the job's run log); off-slot ticks are normal skips.
  const offSlot = gate.reason === 'Not the scheduled hour' || gate.reason === 'Not the scheduled day';
  return Response.json(offSlot ? { skipped: true, reason: gate.reason } : { error: gate.reason }, { status: offSlot ? 200 : 500 });
}