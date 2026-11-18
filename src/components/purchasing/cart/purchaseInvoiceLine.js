export default function purchaseInvoiceLine({ line, item, quantity, price, unit, isWeight, expiryDate }) {
  return {
    inventory_item_id: line.inventory_item_id,
    inventory_item_name: line.inventory_item_name,
    category_id: item?.category_id || '',
    category_name: item?.category_name || '',
    quantity,
    unit,
    unit_type: isWeight ? 'weight' : 'pcs',
    purchase_price: price,
    // No piece count means the server converts the labelled purchase unit.
    price_per_pcs: isWeight ? 0 : price,
    total_cost: Math.round(quantity * price * 100) / 100,
    ...(expiryDate ? { expiry_date: expiryDate } : {}),
  };
}