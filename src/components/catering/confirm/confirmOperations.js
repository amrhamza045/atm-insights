import { base44 } from "@/api/base44Client";
import { equipmentAvailability } from "../equipmentLogic";
import { reserveForEvent } from "../productionPlanning";
import { notifyAssignedStaff } from "./assignmentNotifications";
import { getStaffingRoles } from "../staffing";
import { computeLaborCost, lockLaborCost } from "../laborCost";

async function serverGate(eventId, phase) {
  try {
    await base44.functions.invoke("confirmCateringOperations", { event_id: eventId, phase });
  } catch (e) {
    const data = e?.response?.data;
    if (data?.code === "deposit_not_covered") {
      const err = new Error(data.error);
      err.name = "DepositNotCoveredError";
      throw err;
    }
    throw new Error(data?.error || e.message);
  }
}

/** Guest count the requirements scale against: the guarantee once locked, otherwise the expectation. */
export function billableGuests(event) {
  return (event?.guarantee_locked ? Number(event?.guaranteed_guests) : Number(event?.expected_guests)) || 0;
}

/** Approved scaling formula: flat = fixed qty; per_guest = ceil(guests / divisor) * qty. */
export function resolveRequirementQuantity(req, guests) {
  const qty = Number(req?.quantity) || 0;
  if (req?.scaling_mode !== "per_guest") return qty;
  const divisor = Number(req?.per_guest_divisor) || 1;
  return Math.ceil((Number(guests) || 0) / divisor) * qty;
}

/**
 * Locks the approved quote, advances the event into production, reserves the
 * equipment the source package calls for, and allocates the event's consumable
 * materials against shared inventory (recipe-exploded needs + the package's
 * material template). Material shortfalls never block — covering POs are
 * auto-drafted for procurement instead. On-hand stock is never mutated:
 * allocation is a reservation ledger. Newly assigned crew (not yet notified)
 * get an in-app notification. No payments.
 */
export async function confirmAndStartOperations({ event, quote, userEmail }) {
  // Server re-validates deposit coverage from the live ledger before anything is reserved…
  await serverGate(event.id, "validate");
  const guests = billableGuests(event);
  const equipmentResult = await generateEquipmentReservations({ event, quote, guests, userEmail });
  const materialResult = await allocateMaterials({ event, quote, userEmail });
  const staffNotifications = await notifyAssignedStaff({ event });
  const [roles, assignments] = await Promise.all([
    getStaffingRoles(),
    base44.entities.CateringAssignment.filter({ event_id: event.id, status: "confirmed" }),
  ]);
  const laborCalc = computeLaborCost({ event, roles, assignments });
  await lockLaborCost({ event, calc: laborCalc, userEmail });

  // …and again when locking the quote and starting (audited server-side).
  await serverGate(event.id, "start");

  return { guests, ...equipmentResult, materials: materialResult, staffNotifications };
}

/**
 * Material allocation at confirmation. Reuses the planning ledger: prior
 * reserved rows are released first (re-confirming replaces, never duplicates —
 * also how a post-confirmation guest-count change is picked up), then each
 * need is allocated against free stock with any gap flagged as a shortfall.
 */
async function allocateMaterials({ event, quote, userEmail }) {
  const res = await reserveForEvent({ event, quote, userEmail });

  // Shortfalls are only flagged — ordering goes through the Shortfall Queue / Recommended Cart.
  const posRaised = 0;

  return {
    allocatedCount: res.rows.length,
    shortfallCount: res.shortfalls.length,
    batchCount: res.batches.length,
    unmappedCount: res.requirements.unmapped.length,
    posRaised,
  };
}

async function generateEquipmentReservations({ event, quote, guests, userEmail }) {
  const packageId = quote?.package_id;
  if (!packageId) return { equipmentPlanned: false, reason: "no_package", reservations: [] };

  const pkg = await base44.entities.CateringPackage.get(packageId).catch(() => null);
  const requirements = (pkg?.equipment_requirements || []).filter((r) => r.equipment_id);
  if (requirements.length === 0) return { equipmentPlanned: false, reason: "no_requirements", reservations: [] };

  // Re-confirming replaces the event's prior holds instead of stacking new ones.
  // Already-dispatched rows stay (equipment is physically out) and aren't re-created.
  const prior = await base44.entities.CateringEquipmentReservation.filter({ event_id: event.id });
  const dispatchedIds = new Set(prior.filter((r) => r.status === "dispatched").map((r) => r.equipment_id));
  for (const r of prior.filter((x) => ["requested", "reserved"].includes(x.status))) {
    await base44.entities.CateringEquipmentReservation.update(r.id, {
      status: "released",
      released_by: userEmail || "",
      released_date: new Date().toISOString(),
      release_reason: "Replaced on re-confirmation",
    });
  }

  const [catalog, units, maintenance, existing] = await Promise.all([
    base44.entities.CateringEquipment.list("name", 500),
    base44.entities.CateringEquipmentUnit.list("-created_date", 1000),
    base44.entities.CateringEquipmentMaintenance.list("-created_date", 500),
    base44.entities.CateringEquipmentReservation.filter({ event_date: event.event_date }),
  ]);

  const rows = requirements.filter((req) => !dispatchedIds.has(req.equipment_id)).map((req) => {
    const item = catalog.find((e) => e.id === req.equipment_id);
    const quantity = resolveRequirementQuantity(req, guests);
    const retired = !item || item.is_active === false;
    const free = retired ? 0 : equipmentAvailability(item, units, existing, maintenance, event.event_date).free;
    const short = !retired && free < quantity;

    return {
      branch_id: event.branch_id || "",
      branch_name: event.branch_name || "",
      event_id: event.id,
      event_name: event.event_name || "",
      event_date: event.event_date,
      equipment_id: req.equipment_id,
      equipment_name: item?.name || req.equipment_name || "",
      tracking_mode: item?.tracking_mode || "bulk",
      quantity,
      unit_label: item?.unit_label || "pcs",
      status: retired || short ? "requested" : "reserved",
      conflict_detail: retired
        ? "Catalog item is retired — needs a replacement chosen manually"
        : short
        ? `Only ${free} free of ${quantity} needed on ${event.event_date}`
        : "",
      reserved_by: userEmail || "",
      notes: req.notes || "",
      requires_vehicle: !!item?.requires_vehicle,
    };
  });

  const created = rows.length
    ? await base44.entities.CateringEquipmentReservation.bulkCreate(rows.map(({ requires_vehicle, ...payload }) => payload))
    : [];

  await base44.entities.CateringEvent.update(event.id, {
    reservation_status: rows.some((r) => r.status === "requested") ? "shortfall" : "reserved",
  });

  return {
    equipmentPlanned: true,
    reservations: rows,
    createdCount: created?.length ?? rows.length,
    transportNeeded: rows.filter((r) => r.requires_vehicle),
  };
}