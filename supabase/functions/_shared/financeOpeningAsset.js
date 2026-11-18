import { requireValue, moneyUnits } from './financeValidation.js';
import { resolveAccountBinding } from './financeBindingResolver.js';
import { financePermission, financeBranch } from './financeAccess.js';
import { OPENING_EQUITY_KEY, chooseCutoff, alignOpeningEquity, findOpening, openingLines, postOpeningJournal } from './financeOpening.js';

async function assetAccount(db, company, id, label) {
  const account = id ? await db.FinanceAccount.get(id).catch(() => null) : null;
  requireValue(account?.company_id === company.id && account.classification === 'assets', `Choose the ${label} from this company's asset accounts.`);
  return account;
}

// Fixed assets and equipment at the cut-off: Dr the asset account at cost, Cr accumulated
// depreciation when given, Cr opening balance equity for the net book value.
// The form's request ID is the key, so a retry resumes the same entry.
export async function postOpeningAsset(ctx, company, input) {
  financePermission(ctx, 'finance_journal_approve');
  financeBranch(ctx, company, input.branch_id);
  const db = ctx.svc.entities, d = company.currency_decimals;
  const cost = Number(input.amount), depreciation = Number(input.accumulated_depreciation) || 0;
  const name = String(input.asset_name || '').trim(), notes = String(input.notes || '').trim(), request = String(input.request_id || '');
  requireValue(/^[\w-]{8,64}$/.test(request), 'Reload the page and enter the asset again.');
  requireValue(name.length >= 2 && name.length <= 200, 'Name the asset or asset group.');
  const costUnits = moneyUnits(cost, d), depUnits = moneyUnits(depreciation, d);
  requireValue(costUnits > 0 && depUnits >= 0 && depUnits < costUnits, 'Enter the cost above zero and any accumulated depreciation below it.');
  requireValue(notes.length >= 3 && notes.length <= 500, 'Add the evidence reference, such as the asset register or purchase invoice.');
  const { cutoff, first } = await chooseCutoff(ctx, company, input.cutoff_date);
  const entry_key = `asset:${company.id}:${request}`;
  let entry = await findOpening(db, company, entry_key, (e) => e.amount === cost && (e.accumulated_depreciation || 0) === depreciation && e.asset_name === name && e.notes === notes);
  if (!entry) {
    const asset = await assetAccount(db, company, input.asset_account_id, 'asset account');
    const dep = depUnits ? await assetAccount(db, company, input.depreciation_account_id, 'accumulated depreciation account') : null;
    requireValue(!dep || dep.id !== asset.id, 'Accumulated depreciation needs its own account.');
    const bindings = await alignOpeningEquity(ctx, company, cutoff, first);
    const equity = resolveAccountBinding(bindings, OPENING_EQUITY_KEY, { date: cutoff, dimensions: { branch_id: input.branch_id, currency: company.currency } });
    const common = { cost_center: input.branch_id, channel: 'opening', counterparty_reference: name.slice(0, 100) };
    const raw = [
      { ...common, account_id: asset.id, debit: cost, credit: 0 },
      ...(dep ? [{ ...common, account_id: dep.id, debit: 0, credit: depreciation }] : []),
      { ...common, account_id: equity.account_id, debit: 0, credit: (costUnits - depUnits) / 10 ** d },
    ];
    const lines = await openingLines(ctx, company, raw, cutoff);
    const branch = await db.Branch.get(input.branch_id).catch(() => null);
    entry = await db.FinanceOpeningBalance.create({
      entry_key, company_id: company.id, branch_id: input.branch_id, branch_name: branch?.name || '', kind: 'fixed_asset', status: 'pending', cutoff_date: cutoff,
      amount: cost, accumulated_depreciation: depreciation, asset_name: name, asset_account_id: asset.id, asset_account_code: asset.code, asset_account_name: asset.name,
      depreciation_account_id: dep?.id || '', depreciation_account_code: dep?.code || '', notes, actor_email: ctx.user.email,
      account_snapshot: { raw, lines, mapping_bindings: [{ key: OPENING_EQUITY_KEY, binding_id: equity.id, binding_updated_date: equity.updated_date }] },
    });
  }
  const saved = await postOpeningJournal(ctx, company, entry, `${entry.asset_name} · ${entry.branch_name || entry.branch_id}`);
  return { entry: { ...saved, account_snapshot: undefined } };
}