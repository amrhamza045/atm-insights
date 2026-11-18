// The Finance company an Executive Dashboard report belongs to: the picked
// company, the company owning the picked branch, or (no picker) the first live
// company. Live companies come before test ones, then active before switched
// off; otherwise the oldest first. null while Finance has no matching company.
const preferred = (list) => [...list].sort((a, b) => (!!a.is_test - !!b.is_test) || ((a.is_active === false) - (b.is_active === false)));

export async function pickCompany(svc, input) {
  const { items } = await svc.entities.FinanceCompany.filter({}, { sort: 'created_date', limit: 100 });
  if (input.company_id) return items.find((c) => c.id === input.company_id) || null;
  return preferred(input.branch_id ? items.filter((c) => c.branch_ids?.includes(input.branch_id)) : items)[0] || null;
}