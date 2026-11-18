// Admin › Companies & Branches. Companies are the same records the Finance
// workspace reads, so there is a single source of truth for both screens.
import { financePermission, withFinanceLock } from './financeAccess.js';
import { requireValue } from './financeValidation.js';
import { createFinanceCompany } from './financeCompanies.js';

const BRANCH_FIELDS = ['name','branch_code','is_active','is_default','address','landline','hotline','whatsapp','website','location','latitude','longitude','radius_meters','facebook','instagram','tiktok','dine_in_tax_percentage','dine_in_service_percentage','delivery_tax_percentage','delivery_service_percentage','takeaway_tax_percentage','takeaway_service_percentage','partnership_marketing_text','guest_loyalty_program_text','restaurant_logo_url','receipt_header','receipt_footer','commercial_registration','tax_card'];
const COMPANY_VIEW = c => ({ id: c.id, name: c.name, company_code: c.company_code || '', registration_number: c.registration_number || '', currency: c.currency, currency_decimals: c.currency_decimals, edition: c.edition, is_test: !!c.is_test, is_active: c.is_active !== false, branch_ids: c.branch_ids || [] });

function guard(ctx) {
  financePermission(ctx, 'finance_company_manage');
  requireValue(ctx.admin || !ctx.permissions.branch_id, 'Company setup requires unrestricted branch access.', 403);
}

async function getCompany(ctx, id) {
  requireValue(typeof id === 'string' && id, 'Select a company.');
  const company = await ctx.svc.entities.FinanceCompany.get(id).catch(e => (e.status === 404 ? null : Promise.reject(e)));
  requireValue(company, 'Company not found.', 404);
  return company;
}

async function getBranch(ctx, id) {
  requireValue(typeof id === 'string' && id, 'Select a branch.');
  const branch = await ctx.svc.entities.Branch.get(id).catch(e => (e.status === 404 ? null : Promise.reject(e)));
  requireValue(branch, 'Branch not found.', 404);
  return branch;
}

async function nextCode(ctx) {
  const page = await ctx.svc.entities.FinanceCompany.filter({}, { limit: 500 });
  const max = Math.max(0, ...page.items.map(c => Number(String(c.company_code || '').replace(/\D/g, '')) || 0));
  return `CO-${String(max + 1).padStart(4, '0')}`;
}

async function list(ctx) {
  const [companies, branches, storage] = await Promise.all([
    ctx.svc.entities.FinanceCompany.filter({}, { sort: 'created_date', limit: 100 }),
    ctx.svc.entities.Branch.filter({}, { sort: 'created_date', limit: 200 }),
    ctx.svc.entities.StorageLocation.filter({ is_active: { $ne: false } }, { sort: 'sort_order', limit: 500 }),
  ]);
  return { companies: companies.items.map(COMPANY_VIEW), branches: branches.items, storage: storage.items.map(s => ({ id: s.id, branch_id: s.branch_id, name: s.name })) };
}

// A branch belongs to one company per environment (live or test).
async function assignBranch(ctx, branchId, companyId) {
  const target = await getCompany(ctx, companyId);
  const others = await ctx.svc.entities.FinanceCompany.filter({ branch_ids: branchId, is_test: !!target.is_test, id: { $ne: target.id } }, { limit: 20 });
  for (const other of others.items) {
    await withFinanceLock(ctx, other, fresh => ctx.svc.entities.FinanceCompany.update(fresh.id, { branch_ids: fresh.branch_ids.filter(id => id !== branchId) }));
  }
  if (!target.branch_ids.includes(branchId)) {
    await withFinanceLock(ctx, target, fresh => ctx.svc.entities.FinanceCompany.update(fresh.id, { branch_ids: [...new Set([...fresh.branch_ids, branchId])] }));
  }
}

async function saveBranch(ctx, input) {
  const raw = input.data || {}, data = {};
  for (const key of BRANCH_FIELDS) if (key in raw) data[key] = raw[key];
  if (!input.branch_id || 'name' in data) requireValue(typeof data.name === 'string' && data.name.trim(), 'Branch name is required.');
  if (data.name) data.name = data.name.trim();
  if (!input.branch_id) requireValue(input.company_id, 'Choose the company this branch belongs to.');
  const branch = input.branch_id
    ? await getBranch(ctx, input.branch_id).then(() => ctx.svc.entities.Branch.update(input.branch_id, data))
    : await getCompany(ctx, input.company_id).then(() => ctx.svc.entities.Branch.create({ is_active: true, ...data }));
  if (data.is_default) await ctx.svc.entities.Branch.updateMany({ is_default: true, id: { $ne: branch.id } }, { $set: { is_default: false } });
  if (input.company_id) await assignBranch(ctx, branch.id, input.company_id);
  return { id: branch.id, branch };
}

async function usage(ctx, entities, query) {
  const counts = await Promise.all(entities.map(e => ctx.svc.entities[e].count(query)));
  return entities.filter((_, i) => counts[i] > 0);
}

async function deleteBranch(ctx, input) {
  const branch = await getBranch(ctx, input.branch_id);
  const used = await usage(ctx, ['Order', 'CateringEvent', 'InventoryItem', 'Employee', 'FinanceJournal'], { branch_id: branch.id });
  requireValue(!used.length, `"${branch.name}" already has records (${used.join(', ')}). Turn it off instead of deleting it.`, 409);
  const owners = await ctx.svc.entities.FinanceCompany.filter({ branch_ids: branch.id }, { limit: 20 });
  for (const owner of owners.items) {
    await withFinanceLock(ctx, owner, fresh => ctx.svc.entities.FinanceCompany.update(fresh.id, { branch_ids: fresh.branch_ids.filter(id => id !== branch.id) }));
  }
  await ctx.svc.entities.StorageLocation.deleteMany({ branch_id: branch.id });
  await ctx.svc.entities.Branch.delete(branch.id);
  return { id: branch.id };
}

async function createCompany(ctx, input) {
  const d = input.data || {};
  const { company } = await createFinanceCompany(ctx, { ...d, currency: String(d.currency || '').toUpperCase(), currency_decimals: Number(d.currency_decimals ?? 2), branch_ids: [], member_emails: [], company_code: await nextCode(ctx) });
  return { id: company.id, company: COMPANY_VIEW(company) };
}

async function updateCompany(ctx, input) {
  const company = await getCompany(ctx, input.company_id), d = input.data || {}, patch = {};
  if ('name' in d) { requireValue(typeof d.name === 'string' && d.name.trim() && d.name.trim().length <= 200, 'Enter the company name (up to 200 characters).'); patch.name = d.name.trim(); }
  if ('registration_number' in d) { requireValue(String(d.registration_number).length <= 100, 'Registration number must be no longer than 100 characters.'); patch.registration_number = String(d.registration_number).trim(); }
  if ('is_active' in d) patch.is_active = d.is_active === true;
  const saved = await withFinanceLock(ctx, company, fresh => ctx.svc.entities.FinanceCompany.update(fresh.id, patch));
  return { id: company.id, company: COMPANY_VIEW(saved) };
}

async function deleteCompany(ctx, input) {
  const company = await getCompany(ctx, input.company_id);
  const used = await usage(ctx, ['FinanceJournal', 'FinanceAccount', 'FinanceProposal'], { company_id: company.id });
  requireValue(!used.length, `"${company.name}" already has accounting records. Turn it off instead of deleting it.`, 409);
  await ctx.svc.entities.FinanceCompany.delete(company.id);
  return { id: company.id };
}

const ACTIONS = { list, create_company: createCompany, update_company: updateCompany, delete_company: deleteCompany, save_branch: saveBranch, delete_branch: deleteBranch };

export async function companyAdmin(ctx, input) {
  guard(ctx);
  const run = ACTIONS[input.action];
  requireValue(run, 'Unknown action.');
  return run(ctx, input);
}