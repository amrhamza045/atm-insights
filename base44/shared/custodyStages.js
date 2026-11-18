// Chain-of-custody stage order and trip-stage mapping — single source of truth
// used by createCustodyCheckpoint and escalateCustodyDelays.
// Simplified 3-stage model: warehouse → driver → event site → warehouse.

export const CUSTODY_STAGES = ["dispatched", "delivered", "collected", "returned"];

export const CUSTODY_STAGE_LABELS = {
  dispatched: "Dispatched (warehouse → driver)",
  delivered: "Delivered (driver → event site)",
  collected: "Collected (event site → driver)",
  returned: "Returned (driver → warehouse)",
};

// Which CateringTrip.stage each custody checkpoint drives.
export const TRIP_STAGE_MAP = {
  dispatched: "dispatched",
  delivered: "arrived",
  collected: "returning",
  returned: "returned",
};

// Timestamp field stamped on the trip for each custody stage.
export const TRIP_TS_FIELD = {
  dispatched: "dispatched_at",
  delivered: "arrived_at",
  collected: "returning_at",
  returned: "returned_at",
};

// Who is expected to confirm each stage.
// driver = the trip's assigned driver; warehouse = any authorized staff member.
export const STAGE_CONFIRMER = {
  dispatched: "driver",
  delivered: "driver",
  collected: "driver",
  returned: "warehouse",
};