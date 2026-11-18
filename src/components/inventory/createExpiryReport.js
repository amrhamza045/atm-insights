import { base44 } from "@/api/base44Client";

export function createExpiryReportForInventoryItem(item) {
  if (!item?.expiry_date) return null;
  const quantity = Number(item.quantity) || 0;
  return base44.entities.ExpiryReport.create({
    branch_id: item.branch_id || "",
    branch_name: item.branch_name || "",
    inventory_item_id: item.id,
    inventory_item_name: item.name,
    category_id: item.category_id || "",
    category_name: item.category_name || "",
    batch_ref: `Initial stock ${item.id}`,
    expiry_date: item.expiry_date,
    quantity_at_risk: quantity,
    unit: item.selling_unit_label || item.unit || "",
    estimated_value: quantity * (Number(item.cost_per_unit) || 0),
    status: "open",
    notes: "Created automatically with the inventory item.",
  });
}