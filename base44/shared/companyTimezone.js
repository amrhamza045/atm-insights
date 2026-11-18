// Company timezone = the UTC offset (minutes) saved in Admin → Settings → Timezone.
// No built-in fallback: when it isn't set, callers get null and must say so.
export const TIMEZONE_MISSING = 'Company timezone is not set — ask an admin to set it in Admin → Settings → Timezone.';

export async function getCompanyOffset(entities) {
  const [rec] = await entities.SystemSettings.filter({ setting_key: 'timezone_settings' });
  const v = rec?.timezone_offset_minutes;
  return v === null || v === undefined || !Number.isFinite(Number(v)) ? null : Number(v);
}

const shift = (value, offset) => new Date(new Date(value).getTime() + offset * 60000);

export function dayInOffset(value, offset) {
  return shift(value, offset).toISOString().slice(0, 10);
}

// [start, end) epoch-ms of a company-local calendar day ("YYYY-MM-DD").
export function dayWindow(dateStr, offset) {
  const start = new Date(`${dateStr}T00:00:00Z`).getTime() - offset * 60000;
  return { start, end: start + 86400000 };
}

// Company-local date string for "today" shifted by N days (-1 = yesterday).
export function companyDay(offset, deltaDays = 0) {
  return dayInOffset(Date.now() + deltaDays * 86400000, offset);
}

// Epoch-ms start of the current company-local day, week (Sunday) or month.
export function periodStart(offset, kind) {
  const d = shift(Date.now(), offset);
  d.setUTCHours(0, 0, 0, 0);
  if (kind === 'week') d.setUTCDate(d.getUTCDate() - d.getUTCDay());
  if (kind === 'month') d.setUTCDate(1);
  return d.getTime() - offset * 60000;
}

export function formatInOffset(value, offset) {
  if (offset === null) return TIMEZONE_MISSING;
  const d = shift(value, offset);
  if (!Number.isFinite(d.getTime())) return 'N/A';
  const sign = offset >= 0 ? '+' : '-';
  const abs = Math.abs(offset);
  const tz = `UTC${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`;
  return `${d.toISOString().slice(0, 16).replace('T', ' ')} (${tz})`;
}