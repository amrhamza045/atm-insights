import { base44 } from "@/api/base44Client";

/** Same refresh cadence as the KDS catering panel. */
export const REQUISITION_POLL_MS = 15000;

export const errorText = (error, fallback) => error?.response?.data?.error || error?.message || fallback;
/** The server refused a response because the requisition moved past the revision on screen. */
export const isStale = (error) => error?.response?.data?.code === "stale";

// Every requisition write goes through a backend function; the data rules block direct writes.
export const saveExtraLine = (payload) => base44.functions.invoke("saveRequisitionExtra", payload);
export const submitRequisition = (requisition_id, comment) => base44.functions.invoke("submitRequisition", { requisition_id, comment });
export const replyRequisition = (requisition_id, revision, decisions, comment) =>
  base44.functions.invoke("replyRequisition", { requisition_id, revision, decisions, comment });
export const respondRequisition = (requisition_id, revision, responses, comment) =>
  base44.functions.invoke("respondRequisition", { requisition_id, revision, responses, comment });

export const decideRequisitionApproval = (requisition_id, revision, decision, comment) =>
  base44.functions.invoke("decideRequisitionApproval", { requisition_id, revision, decision, comment });

/** Inventory issues a batch's stock (requisition_release); the chef confirms receipt (requisition_submit). */
export const releaseBatch = (payload) => base44.functions.invoke("releaseRequisitionBatch", payload);
export const receiveBatch = (payload) => base44.functions.invoke("receiveRequisitionBatch", payload);

/** Event-level requisition baseline & additional allowance summary and additional requisition creation. */
export const getEventRequisitionSummary = (event_id) =>
  base44.functions.invoke("syncEventRequisition", { event_id, phase: "event_summary" });
export const createAdditionalRequisition = (event_id, { prefill_shortfalls = false } = {}) =>
  base44.functions.invoke("syncEventRequisition", { event_id, phase: "create_additional", prefill_shortfalls });

export const AWAITING_LABEL = { chef: "Chef's turn", inventory: "Inventory's turn", approver: "Approver's turn", none: "No one's turn" };
export const statusLabel = (status) => String(status || "").replace(/_/g, " ");
export const isAgreed = (line) => line.is_agreed === true;

/** "5 lines · 3 agreed · 2 pending" from Requisition.line_counts. */
export function countsText(c) {
  if (!c) return "Lines not counted yet";
  const parts = ["agreed", "pending", "confirmed", "edited", "declined"].filter((k) => c[k] > 0).map((k) => `${c[k]} ${k}`);
  return [`${c.active || 0} line(s)`, ...parts].join(" · ");
}