import { base44 } from "@/api/base44Client";

/** Calls the client receipt backend; throws an Error carrying the server's message. */
export async function receiptCall(action, payload = {}) {
  try {
    const { data } = await base44.functions.invoke("cateringReceipt", { action, ...payload });
    return data;
  } catch (error) {
    throw new Error(error?.response?.data?.error || error?.message || "Something went wrong");
  }
}

export function openPdf({ pdf_base64, filename }, download = false) {
  const bytes = Uint8Array.from(atob(pdf_base64), (c) => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
  if (download) {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
  } else {
    window.open(url, "_blank");
  }
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export const RECEIPT_TYPE_LABELS = { deposit: "Deposit", final_balance: "Final balance", additional: "Additional payment" };