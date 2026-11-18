/**
 * Go-live readiness of a package's auto-planning data.
 *
 * equipment_requirements and material_requirements were added to CateringPackage
 * after packages already existed. When they are empty, confirmation skips the
 * automatic equipment reservation / material allocation and staff must plan by
 * hand — silently. These helpers make that gap visible before an event is quoted.
 */

export function packageGaps(pkg) {
  return {
    equipment: (pkg?.equipment_requirements || []).filter((r) => r.equipment_id).length === 0,
    materials: (pkg?.material_requirements || []).filter((r) => r.inventory_item_id).length === 0,
  };
}

export function isPackageReady(pkg) {
  const g = packageGaps(pkg);
  return !g.equipment && !g.materials;
}

/** Active packages that would fall back to manual planning at confirmation. */
export function packagesNeedingRequirements(packages = []) {
  return packages.filter((p) => p.is_active !== false && !isPackageReady(p));
}