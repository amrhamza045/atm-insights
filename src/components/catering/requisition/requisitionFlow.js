import { base44 } from "@/api/base44Client";

/** Thrown by planning when the event's requisition has already left draft. */
export class RequisitionLockedError extends Error {
  constructor(message) {
    super(message);
    this.name = "RequisitionLockedError";
  }
}

/** Thrown when the server flow decision can't be made — planning stops before anything is written. */
export class StockFlowError extends Error {
  constructor() {
    super("Planning couldn't start — please try again or contact an admin");
    this.name = "StockFlowError";
  }
}

/**
 * Which stock flow planning uses for an event — the single server decision
 * (old-flow slip history → locked; otherwise Stock Release Slip Requisitions).
 */
export async function getStockFlow(event) {
  let data;
  try {
    ({ data } = await base44.functions.invoke("syncEventRequisition", { event_id: event.id, phase: "check" }));
  } catch (error) {
    console.error("[planning] stock flow decision failed", { event_id: event.id, error: error?.response?.data?.error || error?.message });
    throw new StockFlowError();
  }
  return { requisition: data?.flow === "requisition", rule: data?.rule || "", locked: data?.locked === true, message: data?.message || "" };
}

/** Mirror the event's reserved stock into its draft requisition (server-side). */
export async function syncDraftRequisition(event) {
  const { data } = await base44.functions.invoke("syncEventRequisition", { event_id: event.id, phase: "sync" });
  return data;
}

/** Refresh the event's system-calculated minimum requisition baseline from its latest active quote. */
export async function refreshEventRequisitionBaseline(eventId) {
  if (!eventId) return null;
  const { data } = await base44.functions.invoke("syncEventRequisition", { event_id: eventId, phase: "refresh_baseline" }).catch(() => ({ data: null }));
  return data;
}

/**
 * After the event's reservations were released: cancel its requisition — draft, submitted, replied
 * or confirmed (no-op when it has none). Planning again reopens it as a clean draft.
 */
export async function cancelEventRequisition(event, reason) {
  const { data } = await base44.functions.invoke("syncEventRequisition", { event_id: event.id, phase: "cancel", reason });
  return data;
}

/** Thrown when the event's requisition is still being negotiated (submitted / replied). */
export class RequisitionCloseoutBlockedError extends Error {
  constructor(message) {
    super(message);
    this.name = "RequisitionCloseoutBlockedError";
  }
}

/** Thrown when the event still has scheduled (unreleased) batches: the screen asks hold / release now / close anyway. */
export class UnreleasedBatchesError extends Error {
  constructor(message, batches) {
    super(message);
    this.name = "UnreleasedBatchesError";
    this.batches = batches || [];
  }
}

/**
 * Event closeout (server-side): pending approval / submitted / replied → blocked; unreleased batches → refused
 * unless closeout is { resolution: "close_anyway", reason }; draft → cancelled; the rest kept.
 * context is "stock" or "finalize" (the screen it was started from). Run before anything is closed out.
 */
export async function closeoutEventRequisition(event, context, closeout = {}) {
  try {
    const { data } = await base44.functions.invoke("syncEventRequisition", { event_id: event.id, phase: "closeout", context, ...closeout });
    return data;
  } catch (error) {
    const body = error?.response?.data;
    if (body?.code === "closeout_blocked") throw new RequisitionCloseoutBlockedError(body.error);
    if (body?.code === "unreleased_batches") throw new UnreleasedBatchesError(body.error, body.batches);
    throw error;
  }
}