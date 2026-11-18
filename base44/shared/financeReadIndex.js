import { withFinanceLock } from './financeAccess.js';
import { indexFinanceLedger } from './financeLedger.js';

// Reports read Finance's reporting index (FinanceLedgerLine). Posted journals
// not in it yet are added first, one batch at a time under the Finance lock;
// analytics also brings journals indexed before channel tags existed up to
// date. true once nothing is waiting; false while batches remain or another
// Finance change holds the lock, and the caller asks again shortly.
export async function ensureLedgerIndex(ctx, company, analytics = false) {
  const stale = analytics ? { $or: [{ ledger_ready: { $ne: true } }, { analytics_version: { $ne: 1 } }] } : { ledger_ready: { $ne: true } };
  const waiting = await ctx.svc.entities.FinanceJournal.count({ company_id: company.id, status: 'posted', ...stale });
  if (!waiting) return true;
  const remaining = await withFinanceLock(ctx, company, (fresh) => indexFinanceLedger(ctx, fresh, analytics))
    .catch((error) => (error.status === 409 ? waiting : Promise.reject(error)));
  return remaining === 0;
}