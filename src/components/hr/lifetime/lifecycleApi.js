import { base44 } from "@/api/base44Client";

/** Calls the employeeLifecycle function and surfaces the server's error message. */
export async function lifecycle(payload) {
  try {
    return (await base44.functions.invoke("employeeLifecycle", payload)).data;
  } catch (e) {
    throw new Error(e?.response?.data?.error || e?.message || "Request failed");
  }
}

export const STATUS_STYLE = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

export const fmtDate = (v) => (v ? String(v).slice(0, 10) : "—");