import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { financeContext, financeCompany, branchQuery } from '../../shared/financeAccess.js';
import { supplierRows, supplierPage, supplierEntries, keepRow } from '../../shared/supplierStatementRead.js';

// Finance › Reporting › Our Suppliers: supplier account statements for a Finance
// company, read live from the posted supplier ledger.
const isDay = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const ctx = await financeContext(base44);
    const input = (await req.json().catch(() => null)) || {};
    const company = await financeCompany(ctx, input.company_id);
    const svc = base44.asServiceRole;
    let branchIds = branchQuery(ctx, company).branch_id.$in;
    if (input.branch_id) branchIds = branchIds.filter((id) => id === input.branch_id);
    if (!branchIds.length) return Response.json({ error: 'No access to this branch.' }, { status: 403 });
    const scope = { companyId: company.id, branchIds, from: isDay(input.from) ? input.from : null, to: isDay(input.to) ? input.to : null, search: String(input.search || '').slice(0, 80) };

    if (input.action === 'list') return Response.json({ currency: company.currency, ...supplierPage(await supplierRows(svc, scope), input) });
    if (input.action === 'detail' || input.action === 'export') {
      const ids = input.action === 'detail' ? [String(input.supplier_id || '')] : Array.isArray(input.supplier_ids) && input.supplier_ids.length ? input.supplier_ids.map(String) : null;
      let rows = await supplierRows(svc, { ...scope, search: ids ? '' : scope.search, supplierIds: ids });
      if (input.action === 'export' && !ids) rows = rows.filter((r) => keepRow(r, input));
      if (!rows.length) return Response.json({ error: 'No suppliers match these filters.' }, { status: 404 });
      const entries = await supplierEntries(svc, scope, rows.map((r) => r.supplier_id));
      const suppliers = rows.sort((a, b) => a.supplier_name.localeCompare(b.supplier_name)).map((r) => ({ ...r, entries: entries.get(r.supplier_id) || [] }));
      return Response.json(input.action === 'detail' ? { currency: company.currency, supplier: suppliers[0] } : { currency: company.currency, company: company.name, suppliers });
    }
    return Response.json({ error: 'Unknown action.' }, { status: 400 });
  } catch (error) {
    const status = error.status || 500;
    if (status >= 500) console.error('Supplier statements failed:', error.message);
    return Response.json({ error: error.message }, { status });
  }
}