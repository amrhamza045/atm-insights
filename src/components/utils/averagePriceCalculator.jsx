/**
 * Calculate average prices for inventory items by unit type based on historical invoices
 * @param {Array} invoices - Array of purchase invoices
 * @returns {Object} Map of {itemId: {pcs: {average, count}, weight: {average, count}}}
 */
export const calculateAveragePricesFromInvoices = (invoices) => {
  if (!Array.isArray(invoices)) return {};
  const priceMap = {};
  
  invoices.forEach(invoice => {
    if (!invoice.items) return;
    
    invoice.items.forEach(item => {
      if (!item.inventory_item_id) return;
      
      const itemId = item.inventory_item_id;
      const unitType = item.unit_type || "pcs";
      
      if (!priceMap[itemId]) {
        priceMap[itemId] = {
          pcs: { total: 0, count: 0, average: 0 },
          weight: { total: 0, count: 0, average: 0 }
        };
      }
      
      // For weight-based items with piece count, extract price per piece
      if (unitType === "weight" && item.pieces_count && item.price_per_pcs) {
        priceMap[itemId].pcs.total += item.price_per_pcs;
        priceMap[itemId].pcs.count += 1;
      }
      
      // Always add the purchase price for the unit type
      const unitPrice = item.purchase_price || 0;
      priceMap[itemId][unitType].total += unitPrice;
      priceMap[itemId][unitType].count += 1;
      
      // Recalculate averages
      if (priceMap[itemId].pcs.count > 0) {
        priceMap[itemId].pcs.average = priceMap[itemId].pcs.total / priceMap[itemId].pcs.count;
      }
      if (priceMap[itemId].weight.count > 0) {
        priceMap[itemId].weight.average = priceMap[itemId].weight.total / priceMap[itemId].weight.count;
      }
    });
  });
  
  return priceMap;
};

/**
 * Get average price for a specific item by unit type
 * @param {String} itemId - Inventory item ID
 * @param {Object} priceMap - Price map from calculateAveragePricesFromInvoices
 * @param {String} unitType - Unit type: "pcs" or "weight"
 * @returns {Number} Average price or 0 if not found
 */
export const getAveragePrice = (itemId, priceMap, unitType = "pcs") => {
  if (!priceMap || !itemId) return 0;
  
  const itemPrices = priceMap[itemId];
  if (!itemPrices || !itemPrices[unitType]) return 0;
  
  return itemPrices[unitType].average || 0;
};