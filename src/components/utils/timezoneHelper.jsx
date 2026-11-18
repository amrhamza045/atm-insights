/**
 * Timestamp Helper - Configurable Timezone
 * Database stores UTC timestamps
 * Display functions convert UTC to system timezone for user display
 */

// Get timezone offset in milliseconds from localStorage/settings
export const getTimezoneOffset = () => {
  const stored = localStorage.getItem('app_timezone_offset_minutes');
  if (stored) {
    return parseInt(stored) * 60 * 1000; // Convert minutes to milliseconds
  }
  return 0; // Not set yet: show UTC until an admin sets the company timezone
};

export const isTimezoneSet = () => localStorage.getItem('app_timezone_offset_minutes') !== null;

// Company-local calendar date ("YYYY-MM-DD") of a timestamp, and of now.
export const companyDateOf = (value) => new Date(new Date(value).getTime() + getTimezoneOffset()).toISOString().slice(0, 10);
export const companyToday = () => companyDateOf(Date.now());

// Start (Date) of the current company-local day, week (Sunday) or month.
export const companyPeriodStart = (kind) => {
  const off = getTimezoneOffset();
  const d = new Date(Date.now() + off);
  d.setUTCHours(0, 0, 0, 0);
  if (kind === "week") d.setUTCDate(d.getUTCDate() - d.getUTCDay());
  if (kind === "month") d.setUTCDate(1);
  return new Date(d.getTime() - off);
};

// Last day ("YYYY-MM-DD") of a month; year/month as numbers or strings, month 1-12.
export const monthEndDate = (year, month) =>
  `${year}-${String(month).padStart(2, "0")}-${String(new Date(Date.UTC(Number(year), Number(month), 0)).getUTCDate()).padStart(2, "0")}`;

// Set timezone offset in localStorage
export const setTimezoneOffset = (offsetMinutes) => {
  localStorage.setItem('app_timezone_offset_minutes', String(offsetMinutes));
};

// Get current UTC timestamp (for database storage)
export const getCairoNow = () => {
  return new Date();
};

// Format UTC timestamp in system timezone for display
export const formatCairoDate = (utcDate) => {
  if (!utcDate) return "";
  
  const date = new Date(utcDate);
  const offset = getTimezoneOffset();
  const cairoDate = new Date(date.getTime() + offset);
  
  const year = cairoDate.getUTCFullYear();
  const month = cairoDate.getUTCMonth();
  const day = cairoDate.getUTCDate();
  const hours = cairoDate.getUTCHours();
  const minutes = cairoDate.getUTCMinutes();
  
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthStr = months[month];
  const ampm = hours >= 12 ? "PM" : "AM";
  const hours12 = hours % 12 || 12;
  const minutesStr = String(minutes).padStart(2, "0");
  
  return `${monthStr} ${day}, ${year} at ${hours12}:${minutesStr} ${ampm}`;
};

// Format UTC timestamp in system timezone for receipts
export const formatCairoReceipt = (utcDate) => {
  if (!utcDate) return "";
  
  const date = new Date(utcDate);
  const offset = getTimezoneOffset();
  const cairoDate = new Date(date.getTime() + offset);
  
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayName = days[cairoDate.getUTCDay()];
  const day = String(cairoDate.getUTCDate()).padStart(2, '0');
  const month = String(cairoDate.getUTCMonth() + 1).padStart(2, '0');
  const year = cairoDate.getUTCFullYear();
  const hours = String(cairoDate.getUTCHours()).padStart(2, '0');
  const minutes = String(cairoDate.getUTCMinutes()).padStart(2, '0');
  const seconds = String(cairoDate.getUTCSeconds()).padStart(2, '0');
  
  return `${dayName} ${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
};

// Normalize timestamp: ensure Z suffix so JS treats it as UTC, not local time
const normalizeUTC = (ts) => ts && !ts.endsWith('Z') && !ts.includes('+') ? ts + 'Z' : ts;

// Compare if order is within session (both stored as UTC)
export const isOrderInSession = (orderCreatedDate, sessionOpeningTime, sessionClosingTime) => {
  const orderTime = new Date(normalizeUTC(orderCreatedDate)).getTime();
  const openTime = new Date(normalizeUTC(sessionOpeningTime)).getTime();
  const closeTime = sessionClosingTime ? new Date(normalizeUTC(sessionClosingTime)).getTime() : Infinity;
  
  return orderTime >= openTime && orderTime <= closeTime;
};