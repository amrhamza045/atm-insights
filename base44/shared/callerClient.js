/** The Client record belonging to the signed-in caller (same email match the permission sync uses). */
export async function getCallerClient(svc, user) {
  const email = String(user?.email || '').toLowerCase().trim();
  if (!email) return null;
  const rows = await svc.entities.Client.filter({ email: user.email });
  return rows.find((c) => String(c.email || '').toLowerCase().trim() === email) || rows[0] || null;
}

/** Staff who may read purchase/loyalty data for any client. */
export const isLoyaltyStaff = (user) => user?.role === 'admin' || ['perm_is_central_admin', 'perm_finance_view',
  'perm_admin_actions', 'perm_admin_systems', 'perm_purchases_approve'].some((f) => user?.[f] === true);