import { requireValue } from './financeValidation.js';
import { audit } from './auditLog.js';

export const EXPENSE_GROUPS = [
  'utilities',
  'supplies',
  'maintenance',
  'rent',
  'delivery',
  'marketing',
  'administrative',
  'other',
];

const EXPENSE_ACCOUNT_CLASSES = ['cogs', 'operating_expenses', 'other_result'];

export function assertExpenseAccount(company, account) {
  requireValue(
    account?.company_id === company.id &&
      account.active &&
      account.posting &&
      EXPENSE_ACCOUNT_CLASSES.includes(account.classification),
    'Select an active operating expense or cost-of-sales posting account in this company.'
  );
}

export function requireExpensesConfigPerm(ctx) {
  requireValue(
    ctx.admin || ctx.permissions.expenses_config || ctx.permissions.finance_accounts_manage,
    'Expense type configuration requires Expenses Configuration or Manage Chart of Accounts permission.',
    403
  );
}

export async function listExpenseTypes(ctx, company, search = '') {
  requireValue(typeof search === 'string' && search.length <= 80, 'Search must be at most 80 characters.');
  const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const page = await ctx.svc.entities.FinanceExpenseType.filter(
    {
      company_id: company.id,
      ...(escaped ? { $or: [{ name: { $regex: escaped, $options: 'i' } }, { code: { $regex: escaped, $options: 'i' } }] } : {}),
    },
    { sort: 'name', limit: 200 }
  );
  return page.items;
}

export async function saveExpenseType(ctx, company, input) {
  requireExpensesConfigPerm(ctx);
  const entity = ctx.svc.entities.FinanceExpenseType;
  const previous = input.id ? await entity.get(input.id).catch(() => null) : null;
  if (input.id) requireValue(previous, 'Expense type not found.', 404);
  if (previous) {
    requireValue(previous.company_id === company.id, 'Expense type is outside this company.', 403);
    if (input.expected_updated_date) {
      requireValue(previous.updated_date === input.expected_updated_date, 'Expense type changed. Reload before saving.', 409);
    }
  }
  const data = input.data || {};
  const code = String(data.code || '').trim().toLowerCase();
  const name = String(data.name || '').trim();
  requireValue(/^[a-z][a-z0-9_]{0,79}$/.test(code), 'Use a stable code starting with a letter, followed by letters, numbers or underscores.');
  requireValue(name.length > 0 && name.length <= 120, 'Enter an expense type name up to 120 characters.');
  requireValue(!previous || previous.code === code, 'Expense type codes cannot be changed after creation; create a new type instead.');
  requireValue(EXPENSE_GROUPS.includes(data.category_group || 'other'), 'Choose a valid reporting category.');
  requireValue(typeof data.account_id === 'string' && data.account_id, 'Select a GL expense account.');

  const dup = await entity.count({ company_id: company.id, code, ...(previous ? { id: { $ne: previous.id } } : {}) });
  requireValue(!dup, 'That expense type code already exists in this company.', 409);

  const account = await ctx.svc.entities.FinanceAccount.get(data.account_id).catch(() => null);
  assertExpenseAccount(company, account);

  const payload = {
    company_id: company.id,
    code,
    name,
    category_group: data.category_group || 'other',
    account_id: account.id,
    account_code: account.code,
    account_name: account.name,
    notes: String(data.notes || '').slice(0, 500),
  };

  const saved = previous
    ? await entity.update(previous.id, payload)
    : await entity.create({ ...payload, is_active: true });

  await audit(ctx.base44, ctx.user, previous ? 'update' : 'create', 'FinanceExpenseType', `${previous ? 'Updated' : 'Created'} expense type ${saved.name} (${saved.account_code})`, {
    entityId: saved.id,
    changes: payload,
  });

  return { expense_type: saved };
}

export async function toggleExpenseType(ctx, company, input) {
  requireExpensesConfigPerm(ctx);
  const entity = ctx.svc.entities.FinanceExpenseType;
  const previous = await entity.get(input.id).catch(() => null);
  requireValue(previous && previous.company_id === company.id, 'Expense type not found in this company.', 404);
  requireValue(typeof input.is_active === 'boolean', 'Choose an active state.');
  if (input.is_active) {
    const account = await ctx.svc.entities.FinanceAccount.get(previous.account_id).catch(() => null);
    assertExpenseAccount(company, account);
  }
  const saved = await entity.update(previous.id, { is_active: input.is_active });
  await audit(ctx.base44, ctx.user, 'update', 'FinanceExpenseType', `${input.is_active ? 'Activated' : 'Deactivated'} expense type ${saved.name}`, {
    entityId: saved.id,
    changes: { is_active: input.is_active },
  });
  return { expense_type: saved };
}