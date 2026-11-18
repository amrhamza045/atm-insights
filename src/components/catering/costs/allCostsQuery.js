import { eventType } from "./EventHierarchyFilter";
import { toCaseInsensitiveRegex } from "@/components/admin/production/fuzzyProductionSearch";

export const ALL_COSTS_PAGE_SIZE = 10;

const LIVE_RESERVATION = ["requested", "reserved", "dispatched"];
const LIVE_TRIP = ["planned", "loading", "dispatched", "arrived", "returning"];
const OPEN_MAINT = ["open", "in_progress"];

const today = () => new Date().toISOString().slice(0, 10);

const inWindow = (row, from, to) => {
  const date = row.event_date;
  if (!date) return true;
  if (date < (from || today())) return false;
  if (to && date > to) return false;
  return true;
};

function eventMatchesFilter(eventIdField, eventNameField, filterEventId) {
  if (!filterEventId || filterEventId === "all") return true;
  if (filterEventId.startsWith("type:")) {
    const type = filterEventId.slice(5);
    return eventType(eventNameField || "Event") === type;
  }
  return eventIdField === filterEventId;
}

function intersectSets(baseSet, nextSet) {
  if (baseSet === null) return new Set(nextSet);
  const out = new Set();
  for (const item of baseSet) {
    if (nextSet.has(item)) out.add(item);
  }
  return out;
}

export function buildEquipmentCostsWhere({
  branchId,
  filter = {},
  search = "",
  reservations = [],
  maintenance = [],
}) {
  const { status = "all", eventId = "all", from = "", to = "" } = filter;
  const hasEventFilter = Boolean(eventId && eventId !== "all");

  if (status === "available" && hasEventFilter) {
    return null;
  }

  const clauses = [{ is_active: { $ne: false } }];

  if (branchId) {
    clauses.push({ home_branch_id: { $in: [branchId, null, ""] } });
  }

  const liveReservations = reservations.filter(
    (r) => r.equipment_id && LIVE_RESERVATION.includes(r.status) && inWindow(r, from, to)
  );
  const openMaint = maintenance.filter(
    (m) => m.equipment_id && OPEN_MAINT.includes(m.status || "open")
  );

  const reservedIds = new Set(liveReservations.map((r) => r.equipment_id));
  const maintainedIds = new Set(
    openMaint.filter((m) => m.record_type !== "damage").map((m) => m.equipment_id)
  );
  const inMaintIds = new Set(
    openMaint
      .filter((m) => m.record_type !== "damage" && m.status === "in_progress")
      .map((m) => m.equipment_id)
  );
  const damagedIds = new Set(
    openMaint.filter((m) => m.record_type === "damage").map((m) => m.equipment_id)
  );

  if (status === "available") {
    const unavailableIds = new Set([...reservedIds, ...maintainedIds, ...damagedIds]);
    if (unavailableIds.size > 0) {
      clauses.push({ id: { $nin: Array.from(unavailableIds) } });
    }
  } else {
    let allowedIds = null;
    if (hasEventFilter) {
      const eventIds = new Set(
        liveReservations
          .filter((r) => eventMatchesFilter(r.event_id, r.event_name, eventId))
          .map((r) => r.equipment_id)
      );
      allowedIds = intersectSets(allowedIds, eventIds);
    }
    if (status === "reserved") {
      allowedIds = intersectSets(allowedIds, reservedIds);
    } else if (status === "maintenance") {
      allowedIds = intersectSets(allowedIds, maintainedIds);
    } else if (status === "in_maintenance") {
      allowedIds = intersectSets(allowedIds, inMaintIds);
    } else if (status === "damaged") {
      allowedIds = intersectSets(allowedIds, damagedIds);
    }

    if (allowedIds !== null) {
      if (allowedIds.size === 0) return null;
      clauses.push({ id: { $in: Array.from(allowedIds) } });
    }
  }

  const q = search.trim().toLowerCase();
  if (q && !"equipment".includes(q)) {
    const ci = toCaseInsensitiveRegex(q);
    const orClauses = [{ name: { $regex: ci } }, { category: { $regex: ci } }];
    if ("uncategorised".includes(q)) {
      orClauses.push({ category: { $in: [null, ""] } });
    }
    if ("rented".includes(q)) {
      orClauses.push({ cost_source: "rented" });
    }
    if ("owned".includes(q)) {
      orClauses.push({ cost_source: { $in: ["owned", null, ""] } });
    }
    clauses.push({ $or: orClauses });
  }

  return clauses.length === 1 ? clauses[0] : { $and: clauses };
}

export function buildStaffingCostsWhere({
  filter = {},
  search = "",
  staffRows = [],
}) {
  const { status = "all", eventId = "all" } = filter;
  const hasEventFilter = Boolean(eventId && eventId !== "all");

  if (
    status === "maintenance" ||
    status === "in_maintenance" ||
    status === "damaged" ||
    (status === "available" && hasEventFilter)
  ) {
    return null;
  }

  const clauses = [{ is_active: { $ne: false } }];

  const reservedNames = new Set(
    staffRows
      .filter((s) => s.role_name && (s.events || []).length > 0)
      .map((s) => s.role_name)
  );

  if (status === "available") {
    if (reservedNames.size > 0) {
      clauses.push({ name: { $nin: Array.from(reservedNames) } });
    }
  } else {
    let allowedNames = null;
    if (hasEventFilter) {
      const eventNames = new Set(
        staffRows
          .filter(
            (s) =>
              s.role_name &&
              (s.events || []).some((e) => eventMatchesFilter(e.id, e.name, eventId))
          )
          .map((s) => s.role_name)
      );
      allowedNames = intersectSets(allowedNames, eventNames);
    }
    if (status === "reserved") {
      allowedNames = intersectSets(allowedNames, reservedNames);
    }

    if (allowedNames !== null) {
      if (allowedNames.size === 0) return null;
      clauses.push({ name: { $in: Array.from(allowedNames) } });
    }
  }

  const q = search.trim().toLowerCase();
  if (q && !"staffing".includes(q)) {
    const ci = toCaseInsensitiveRegex(q);
    clauses.push({
      $or: [{ name: { $regex: ci } }, { department: { $regex: ci } }],
    });
  }

  return clauses.length === 1 ? clauses[0] : { $and: clauses };
}

export function buildLogisticsCostsWhere({
  branchId,
  filter = {},
  search = "",
  trips = [],
}) {
  const { status = "all", eventId = "all", from = "", to = "" } = filter;
  const hasEventFilter = Boolean(eventId && eventId !== "all");

  if (status === "damaged" || (status === "available" && hasEventFilter)) {
    return null;
  }

  const clauses = [];

  if (branchId) {
    clauses.push({ home_branch_id: { $in: [branchId, null, ""] } });
  }

  const liveTrips = trips.filter(
    (t) => t.vehicle_id && LIVE_TRIP.includes(t.stage || "planned") && inWindow(t, from, to)
  );
  const reservedVehicleIds = new Set(liveTrips.map((t) => t.vehicle_id));

  if (status === "available") {
    clauses.push({ status: { $ne: "maintenance" } });
    if (reservedVehicleIds.size > 0) {
      clauses.push({ id: { $nin: Array.from(reservedVehicleIds) } });
    }
  } else if (status === "maintenance" || status === "in_maintenance") {
    clauses.push({ status: "maintenance" });
    if (hasEventFilter) {
      const eventIds = new Set(
        liveTrips
          .filter((t) => eventMatchesFilter(t.event_id, t.event_name, eventId))
          .map((t) => t.vehicle_id)
      );
      if (eventIds.size === 0) return null;
      clauses.push({ id: { $in: Array.from(eventIds) } });
    }
  } else {
    let allowedIds = null;
    if (hasEventFilter) {
      const eventIds = new Set(
        liveTrips
          .filter((t) => eventMatchesFilter(t.event_id, t.event_name, eventId))
          .map((t) => t.vehicle_id)
      );
      allowedIds = intersectSets(allowedIds, eventIds);
    }
    if (status === "reserved") {
      allowedIds = intersectSets(allowedIds, reservedVehicleIds);
    }
    if (allowedIds !== null) {
      if (allowedIds.size === 0) return null;
      clauses.push({ id: { $in: Array.from(allowedIds) } });
    }
  }

  const q = search.trim().toLowerCase();
  if (q && !"logistics".includes(q)) {
    const ci = toCaseInsensitiveRegex(q);
    const orClauses = [
      { name: { $regex: ci } },
      { plate_number: { $regex: ci } },
      { vehicle_type: { $regex: ci } },
    ];
    if (/\s/.test(q)) {
      orClauses.push({
        vehicle_type: { $regex: toCaseInsensitiveRegex(q.replace(/\s+/g, "_")) },
      });
    }
    clauses.push({ $or: orClauses });
  }

  if (clauses.length === 0) return {};
  return clauses.length === 1 ? clauses[0] : { $and: clauses };
}