export const CUSTODY_STAGES = ["dispatched", "delivered", "collected", "returned"];

export const CUSTODY_LABELS = {
  dispatched: "Dispatched (warehouse → driver)",
  delivered: "Delivered (driver → event site)",
  collected: "Collected (event site → driver)",
  returned: "Returned (driver → warehouse)",
};

// Who is expected to confirm each stage.
export const STAGE_CONFIRMER = {
  dispatched: "driver",
  delivered: "driver",
  collected: "driver",
  returned: "warehouse",
};

export const confirmerLabel = (stage, trip) => {
  const a = (trip?.custody_assignments || []).find((x) => x.stage === stage && x.assigned_email);
  if (a) return a.assigned_name ? `${a.assigned_name} (${a.assigned_email})` : a.assigned_email;
  return STAGE_CONFIRMER[stage] === "driver"
    ? trip?.driver_name || "No driver assigned"
    : "Warehouse team";
};