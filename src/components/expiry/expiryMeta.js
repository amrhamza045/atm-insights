import isAdminUser from "@/components/permissions/isAdminUser";

/**
 * Expiry management has its own flag rather than reusing inventory_edit: the
 * original audience was the kitchen/bar heads and managers who act on expiring
 * stock — it deliberately excluded the inventory manager, so it is a different
 * audience, not simply a narrower slice of inventory editing.
 */
export function canEditExpiry(currentUser, permissions) {
  if (isAdminUser(currentUser, permissions)) return true;
  return !!permissions?.expiry_manage;
}

export function daysUntil(dateStr) {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.round((target - today) / 86400000);
}

export function severityFor(dateStr) {
  const days = daysUntil(dateStr);
  if (days === null) return { key: "watch", label: "Watch", classes: "bg-slate-100 text-slate-700 border-slate-200", days };
  if (days <= 2) return { key: "critical", label: days < 0 ? "Expired" : "Critical", classes: "bg-red-100 text-red-700 border-red-200", days };
  if (days <= 7) return { key: "warning", label: "Warning", classes: "bg-warning-100 text-warning-700 border-warning-200", days };
  return { key: "watch", label: "Watch", classes: "bg-blue-100 text-blue-700 border-blue-200", days };
}

export function daysLabel(days) {
  if (days === null) return "";
  if (days < 0) return `${Math.abs(days)} day(s) overdue`;
  if (days === 0) return "Expires today";
  return `${days} day(s) left`;
}

/** Menu items whose recipe (default or per-size) uses this raw material. */
export function affectedMenuItems(menuItems, inventoryItemId) {
  if (!inventoryItemId) return [];
  return menuItems.filter((mi) => {
    const inDefault = (mi.recipe || []).some((r) => r.inventory_item_id === inventoryItemId);
    if (inDefault) return true;
    const sizeRecipes = mi.size_recipes || {};
    return Object.values(sizeRecipes).some((rows) =>
      (rows || []).some((r) => r.inventory_item_id === inventoryItemId)
    );
  });
}