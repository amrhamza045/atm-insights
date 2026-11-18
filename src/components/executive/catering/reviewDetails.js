import { base44 } from "@/api/base44Client";
import { formatCurrency } from "@/components/utils/currencyFormatter";

export const reviewMoney = (value) => value == null ? "—" : formatCurrency(value, true);
const section = (title, columns, rows) => ({ title, columns, rows });
const priceLines = (lines = []) => lines.map(l => [l.name, l.description || "—", l.quantity, l.scaling || "fixed", l.cost_category || "food", reviewMoney(l.unit_price), reviewMoney(l.unit_cost)]);
const priceColumns = ["Item", "Description", "Quantity", "Scaling", "Cost category", "Unit price", "Unit cost"];

export default async function reviewDetails(key, event, quote) {
  if (key === "revenue_variance") {
    if (!quote) return [];
    return [
      section(`Quote revision ${quote.revision_number} · ${quote.status}`, ["Detail", "Value"], [
        ["Package", quote.package_name || "Manual quote"], ["Guests at quote", quote.guests_at_quote],
        ["Subtotal", reviewMoney(quote.subtotal)], ["Discount", reviewMoney(quote.discount_amount)],
        ["Tax", reviewMoney(quote.tax_total)], ["Service charge", reviewMoney(quote.service_charge_total)],
        ["Quote total", reviewMoney(quote.total)], ["Estimated cost", reviewMoney(quote.estimated_cost)],
        ["Estimated margin", reviewMoney(quote.estimated_margin)], ["Total paid", reviewMoney(event.total_paid)],
        ["Balance due", reviewMoney(event.balance_due)], ["Revenue basis", event.actual_revenue_basis], ["Notes", quote.notes || "—"],
      ]), section("Saved quote line items", priceColumns, priceLines(quote.line_items)),
    ];
  }
  if (key === "labor_baseline_alignment") {
    const packages = quote?.package_id ? await base44.entities.CateringPackage.filter({ id: quote.package_id }) : [];
    const pkg = packages[0];
    return [
      section(pkg ? `${pkg.name} — current catalog pricing` : "No linked catalog package — saved quote pricing", ["Detail", "Value"], [
        ["Description", pkg?.description || "—"], ["Pricing mode", pkg?.pricing_mode || "Saved quote"],
        ["Price per guest", reviewMoney(pkg?.base_price_per_guest)], ["Flat price", reviewMoney(pkg?.flat_price)],
        ["Minimum guests", pkg?.min_guests], ["Quote total (saved baseline)", reviewMoney(quote?.total)],
        ["Quote estimated margin", reviewMoney(quote?.estimated_margin)], ["Expected labor", reviewMoney(event.estimated_labor_cost)],
        ["Labor baseline locked", event.labor_cost_locked ? "Yes" : "No"], ["Notes", pkg?.notes || "—"],
      ]), section(pkg ? "Current package line items (not historical actual costs)" : "Saved quote line items", priceColumns, priceLines(pkg?.line_items || quote?.line_items)),
    ];
  }
  if (key === "labor_cost_variance") {
    const assignments = await base44.entities.CateringAssignment.filter({ event_id: event.id });
    return [
      section("Staffing requirements", ["Role", "Required", "Critical"], (event.staffing_requirements || []).map(r => [r.role_name, r.required_count, r.is_critical ? "Yes" : "No"])),
      section("Locked labor breakdown", ["Role", "Pay basis", "Required", "Filled", "Rate", "Hours", "Subtotal"], (event.labor_cost_breakdown || []).map(r => [r.role_name, r.pay_basis, r.required_count, r.filled_count, reviewMoney(r.rate), r.hours, reviewMoney(r.subtotal)])),
      section("Event assignments", ["Employee", "Role", "Status", "Start", "End", "Expected hours", "Estimated cost"], assignments.map(a => [a.employee_name, a.role_name, a.status, a.start_time, a.end_time, a.expected_hours, reviewMoney(a.estimated_cost)])),
    ];
  }
  if (key === "equipment_cost_variance") {
    const [reservations, damage] = await Promise.all([
      base44.entities.CateringEquipmentReservation.filter({ event_id: event.id }),
      base44.entities.CateringEquipmentMaintenance.filter({ event_id: event.id, record_type: "damage" }),
    ]);
    return [
      section("Equipment handling and returns", ["Equipment", "Unit", "Status", "Reserved", "Returned", "Damaged", "Missing", "Missing cost", "Return notes"], reservations.map(r => [r.equipment_name, r.unit_code, r.status, r.quantity, r.returned_quantity, r.damaged_quantity, r.missing_quantity, reviewMoney(r.missing_cost), r.return_notes])),
      section("Damage records", ["Equipment", "Description", "Status", "Quantity affected", "Total repair cost", "Notes"], damage.map(d => [d.equipment_name, d.description, d.status, d.quantity_affected, reviewMoney(d.cost), d.notes])),
    ];
  }
  if (key === "food_cost_variance") {
    const lines = (quote?.line_items || []).filter(l => (l.cost_category || "food") === "food");
    const ids = [...new Set(lines.map(l => l.menu_item_id).filter(Boolean))];
    const menu = ids.length ? await base44.entities.MenuItem.filter({ id: { $in: ids } }) : [];
    const recipes = menu.flatMap(item => [{ name: item.name, ingredients: item.recipe || [] }, ...Object.entries(item.size_recipes || {}).map(([size, ingredients]) => ({ name: `${item.name} · ${size}`, ingredients }))]);
    const ingredientIds = [...new Set(recipes.flatMap(r => r.ingredients.map(i => i.inventory_item_id)).filter(Boolean))];
    const stock = ingredientIds.length ? await base44.entities.InventoryItem.filter({ id: { $in: ingredientIds } }) : [];
    const byId = Object.fromEntries(stock.map(i => [i.id, i]));
    return [
      section("Saved food quote baseline", priceColumns, priceLines(lines)),
      section("Current recipes and purchase-unit costs — not historical actual valuation", ["Menu item / size", "Ingredient", "Recipe quantity", "Recipe unit", "Current purchase-unit cost", "Purchase unit"], recipes.flatMap(r => r.ingredients.map(i => {
        const item = byId[i.inventory_item_id];
        return [r.name, i.inventory_item_name || item?.name || i.inventory_item_id, i.quantity_needed, i.unit, reviewMoney(item?.cost_per_unit), item?.purchase_unit_label || item?.purchase_unit || "—"];
      }))),
      section("Recipe availability", ["Quote item", "Recipe status"], lines.map(l => [l.name, !l.menu_item_id ? "Custom item — no linked recipe" : recipes.some(r => r.name === menu.find(m => m.id === l.menu_item_id)?.name && r.ingredients.length) ? "Default recipe listed above" : "No default recipe available; any size recipes are listed above"])),
    ];
  }
  return [];
}