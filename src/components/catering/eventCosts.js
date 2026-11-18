import { round2 } from "./cateringLogic";

const LIVE_RES = ["requested", "reserved", "dispatched", "returned"];

/**
 * Equipment usage cost of an event: each live reservation priced at its event
 * override when set, otherwise at the item's predefined per-event cost.
 */
export function equipmentUsageCost(reservations = [], equipment = []) {
  return round2(
    reservations
      .filter((r) => LIVE_RES.includes(r.status))
      .reduce((s, r) => {
        const item = equipment.find((e) => e.id === r.equipment_id);
        const rate = r.cost_overridden
          ? Number(r.usage_cost_per_event) || 0
          : Number(item?.usage_cost_per_event) || 0;
        return s + rate * (Number(r.quantity) || 1);
      }, 0)
  );
}

/** Transport cost of an event: every live trip's estimate (per-km or per-day). */
export function tripTransportCost(trips = []) {
  return round2(
    trips.filter((t) => t.stage !== "cancelled").reduce((s, t) => s + (Number(t.estimated_transport_cost) || 0), 0)
  );
}