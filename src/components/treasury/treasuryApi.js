import { base44 } from "@/api/base44Client";

export async function treasuryCall(payload) {
  const res = await base44.functions.invoke("treasuryModules", payload);
  if (res.data?.error) throw new Error(res.data.error);
  return res.data;
}

export function treasuryError(error) {
  return error?.response?.data?.error || error?.message || "Treasury request failed.";
}

export function formatMoney(currency, amount) {
  const cur = currency || "EGP";
  return `${cur} ${Number(amount || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}