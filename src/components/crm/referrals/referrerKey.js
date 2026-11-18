// One guest can refer several people (one referral per event pass), so their
// commissions are grouped by this key: phone digits, else email, else name.
export function referrerKeyOf(referral) {
  const phone = String(referral?.referrer_phone || "").replace(/\D/g, "");
  if (phone) return `p:${phone}`;
  const email = String(referral?.referrer_email || "").trim().toLowerCase();
  if (email) return `e:${email}`;
  return `n:${String(referral?.referrer_name || "").trim().toLowerCase()}`;
}