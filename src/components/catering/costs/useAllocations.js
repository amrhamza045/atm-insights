import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { excludeSystemAccounts } from "@/components/hr/systemAccount";
import { eventType } from "./EventHierarchyFilter";

const LIVE_RESERVATION = ["requested", "reserved", "dispatched"];
const LIVE_TRIP = ["planned", "loading", "dispatched", "arrived", "returning"];
const OPEN_MAINT = ["open", "in_progress"];

// Bookings for events that already happened no longer hold the resource.
const today = () => new Date().toISOString().slice(0, 10);

/**
 * Does a booking fall inside the window the user is asking about?
 * No window → anything from today onwards. "From" only → that date onwards.
 */
const inWindow = (row, from, to) => {
  const date = row.event_date;
  if (!date) return true;
  if (date < (from || today())) return false;
  if (to && date > to) return false;
  return true;
};

/**
 * Live allocation data shared by the Equipment / Staffing / Logistics cost tabs:
 * which items are reserved (and for which event), under maintenance, or damaged.
 */
export function useAllocations({ from = "", to = "" } = {}) {
  const { data: reservations = [], isLoading: resLoading } = useQuery({
    queryKey: ["catering-equipment-reservations"],
    queryFn: () => base44.entities.CateringEquipmentReservation.list("-created_date", 1000),
  });
  const { data: maintenance = [], isLoading: maintLoading } = useQuery({
    queryKey: ["catering-equipment-maintenance"],
    queryFn: () => base44.entities.CateringEquipmentMaintenance.list("-created_date", 500),
  });
  const { data: assignments = [], isLoading: assignLoading } = useQuery({
    queryKey: ["catering-assignments"],
    queryFn: () => base44.entities.CateringAssignment.list("-created_date", 1000),
  });
  const { data: trips = [], isLoading: tripsLoading } = useQuery({
    queryKey: ["catering-trips"],
    queryFn: () => base44.entities.CateringTrip.list("-created_date", 500),
  });
  const { data: employees = [], isLoading: empLoading } = useQuery({
    queryKey: ["employees-all"],
    queryFn: () => base44.entities.Employee.list("-created_date", 1000).then(excludeSystemAccounts),
  });

  const isLoading = resLoading || maintLoading || assignLoading || tripsLoading || empLoading;

  const equipmentAllocation = (equipmentId) => {
    const live = reservations.filter(
      (r) => r.equipment_id === equipmentId && LIVE_RESERVATION.includes(r.status) && inWindow(r, from, to)
    );
    const open = maintenance.filter((m) => m.equipment_id === equipmentId && OPEN_MAINT.includes(m.status || "open"));
    return {
      events: live.map((r) => ({ id: r.event_id, name: r.event_name || "Event", date: r.event_date })),
      maintenance: open.filter((m) => m.record_type !== "damage").length,
      maintenance_active: open.filter((m) => m.record_type !== "damage" && m.status === "in_progress").length,
      damaged: open.filter((m) => m.record_type === "damage").length,
    };
  };

  const vehicleAllocation = (vehicle) => {
    const live = trips.filter(
      (t) => t.vehicle_id === vehicle.id && LIVE_TRIP.includes(t.stage || "planned") && inWindow(t, from, to)
    );
    return {
      events: live.map((t) => ({ id: t.event_id, name: t.event_name || "Event", date: t.event_date })),
      maintenance: vehicle.status === "maintenance" ? 1 : 0,
      maintenance_active: vehicle.status === "maintenance" ? 1 : 0,
      damaged: 0,
    };
  };

  const staffAllocations = () => {
    // Start from the whole active roster so unbooked people show as available.
    const map = {};
    employees
      .filter((e) => e.status !== "terminated" && e.status !== "inactive")
      .forEach((e) => {
        map[e.id] = {
          employee_id: e.id,
          employee_name: e.full_name || e.name || "Staff member",
          role_name: e.position,
          events: [],
        };
      });
    assignments
      .filter((a) => (a.status || "confirmed") === "confirmed" && inWindow(a, from, to))
      .forEach((a) => {
        const row = (map[a.employee_id] = map[a.employee_id] || {
          employee_id: a.employee_id,
          employee_name: a.employee_name || "Staff member",
          role_name: a.role_name,
          events: [],
        });
        row.events.push({ id: a.event_id, name: a.event_name || "Event", date: a.event_date });
      });
    return Object.values(map).sort((a, b) => a.employee_name.localeCompare(b.employee_name));
  };

  const eventOptions = () => {
    const map = {};
    [...reservations, ...trips, ...assignments].forEach((r) => {
      if (r.event_id) map[r.event_id] = r.event_name || "Event";
    });
    return Object.entries(map)
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  return {
    equipmentAllocation,
    vehicleAllocation,
    staffAllocations,
    eventOptions,
    reservations,
    maintenance,
    trips,
    isLoading,
  };
}

/** Does an allocation match the selected status + event filter? */
export function matchesAllocation(alloc, status, eventId) {
  if (eventId && eventId.startsWith("type:")) {
    const type = eventId.slice(5);
    if (!alloc.events.some((e) => eventType(e.name) === type)) return false;
  } else if (eventId && eventId !== "all" && !alloc.events.some((e) => e.id === eventId)) return false;
  if (status === "reserved") return alloc.events.length > 0;
  if (status === "maintenance") return alloc.maintenance > 0;
  if (status === "in_maintenance") return (alloc.maintenance_active || 0) > 0;
  if (status === "damaged") return alloc.damaged > 0;
  if (status === "available") return alloc.events.length === 0 && !alloc.maintenance && !alloc.damaged;
  return true;
}