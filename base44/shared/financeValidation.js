export function requireValue(condition, message, status = 400) { if (!condition) throw Object.assign(new Error(message), { status }); }
export function validDate(value) { return /^\d{4}-\d{2}-\d{2}$/.test(value || '') && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value; }
export function moneyUnits(value, decimals = 2) {
 const number = Number(value), scale = 10 ** decimals;
 requireValue(Number.isFinite(number) && number >= 0 && number <= 1e12, 'Amounts must be finite, non-negative and no greater than 1 trillion.');
 requireValue(Math.abs(number * scale - Math.round(number * scale)) < 0.001, `Use at most ${decimals} decimal places.`);
 return Math.round(number * scale);
}
export function validateLines(lines, decimals = 2) {
 requireValue(Array.isArray(lines) && lines.length >= 2 && lines.length <= 100, 'A journal needs 2–100 lines.');
 let debit=0,credit=0;
 for (const line of lines) {
  const d=moneyUnits(line.debit,decimals),c=moneyUnits(line.credit,decimals);
  requireValue((d>0)!==(c>0), 'Each line must have either a debit or a credit, not both.');
  requireValue(typeof line.account_id==='string' && line.account_id, 'Map every line to an account.');
  requireValue(typeof line.cost_center==='string' && line.cost_center.trim(), 'A cost center is required on every line.');
  debit+=d; credit+=c;
 }
 requireValue(Number.isSafeInteger(debit) && Number.isSafeInteger(credit), 'Journal total is too large.');
 requireValue(debit===credit, 'Debits and credits must balance exactly.');
 return {total_debit:debit/(10**decimals),total_credit:credit/(10**decimals)};
}