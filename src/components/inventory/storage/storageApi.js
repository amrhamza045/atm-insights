import { base44 } from "@/api/base44Client";

export const DEFAULT_LOCATIONS = ["Main Storage", "Fridge", "Freezer"];

export async function listLocations(branchId) {
  const page = await base44.entities.StorageLocation.filter({ branch_id: branchId }, { sort: "sort_order", limit: 200 });
  return page.items;
}

// Creates any missing default locations, then puts every unassigned item of this branch in Main Storage.
export async function setupDefaults(branchId, branchName) {
  const existing = await listLocations(branchId);
  const names = existing.map((l) => l.name.toLowerCase());
  const missing = DEFAULT_LOCATIONS.filter((n) => !names.includes(n.toLowerCase()));
  const created = missing.length
    ? await base44.entities.StorageLocation.bulkCreate(missing.map((name) => ({
        branch_id: branchId, branch_name: branchName, name, sort_order: DEFAULT_LOCATIONS.indexOf(name),
      })))
    : [];
  const main = [...existing, ...created].find((l) => l.name.toLowerCase() === "main storage");
  let assigned = 0;
  for (const query of [
    { branch_id: branchId, storage_location_id: { $exists: false } },
    { branch_id: branchId, storage_location_id: "" },
  ]) {
    let res;
    do {
      res = await base44.entities.InventoryItem.updateMany(query, { $set: { storage_location_id: main.id, storage_location_name: main.name } });
      assigned += res?.updated ?? res?.modified ?? 0;
    } while (res?.has_more);
  }
  return { created: created.length, assigned };
}

export async function renameLocation(location, name) {
  await base44.entities.StorageLocation.update(location.id, { name });
  let res;
  do {
    res = await base44.entities.InventoryItem.updateMany(
      { storage_location_id: location.id, storage_location_name: { $ne: name } },
      { $set: { storage_location_name: name } }
    );
  } while (res?.has_more);
}