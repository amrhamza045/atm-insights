// Builds supplier price-trend series from purchase invoices.
// Each invoice line gives us: supplier, item, date, unit purchase price.

export function buildPriceSeries(invoices, monthsBack = 12) {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - monthsBack);

  const map = {}; // key: supplierId|itemId
  invoices.forEach((inv) => {
    if (!inv.invoice_date || !Array.isArray(inv.items)) return;
    const d = new Date(inv.invoice_date);
    if (isNaN(d) || d < cutoff) return;

    inv.items.forEach((line) => {
      const price = Number(line.purchase_price) || 0;
      if (!price || !line.inventory_item_id) return;
      const key = `${inv.supplier_id || "unknown"}|${line.inventory_item_id}`;
      if (!map[key]) {
        map[key] = {
          key,
          supplier_id: inv.supplier_id,
          supplier_name: inv.supplier_name || "Unknown supplier",
          item_id: line.inventory_item_id,
          item_name: line.inventory_item_name || "Unnamed item",
          unit: line.unit || "",
          points: [],
        };
      }
      map[key].points.push({
        date: inv.invoice_date,
        price,
        quantity: Number(line.quantity) || 0,
        invoice_number: inv.invoice_number,
      });
    });
  });

  return Object.values(map)
    .map((s) => {
      const points = s.points.sort((a, b) => new Date(a.date) - new Date(b.date));
      const first = points[0];
      const latest = points[points.length - 1];
      const previous = points.length > 1 ? points[points.length - 2] : null;

      const changeFromFirst = first.price ? ((latest.price - first.price) / first.price) * 100 : 0;
      const changeFromPrevious = previous && previous.price
        ? ((latest.price - previous.price) / previous.price) * 100
        : 0;

      const prices = points.map((p) => p.price);
      const totalQty = points.reduce((sum, p) => sum + p.quantity, 0);
      // Extra annual cost if the latest price applies to the volume bought at the first price
      const costImpact = (latest.price - first.price) * totalQty;

      return {
        ...s,
        points,
        purchases: points.length,
        firstPrice: first.price,
        firstDate: first.date,
        latestPrice: latest.price,
        latestDate: latest.date,
        previousPrice: previous ? previous.price : null,
        changeFromFirst,
        changeFromPrevious,
        minPrice: Math.min(...prices),
        maxPrice: Math.max(...prices),
        totalQty,
        costImpact,
        direction: changeFromFirst > 0.5 ? "up" : changeFromFirst < -0.5 ? "down" : "flat",
      };
    })
    .filter((s) => s.purchases > 1);
}

// Rolls the per-item series up to one row per supplier
export function buildSupplierSummary(series) {
  const bySupplier = {};
  series.forEach((s) => {
    const id = s.supplier_id || "unknown";
    if (!bySupplier[id]) {
      bySupplier[id] = {
        supplier_id: id,
        supplier_name: s.supplier_name,
        items: 0,
        raised: 0,
        reduced: 0,
        flat: 0,
        weightedChange: 0,
        weight: 0,
        costImpact: 0,
      };
    }
    const row = bySupplier[id];
    row.items += 1;
    if (s.direction === "up") row.raised += 1;
    else if (s.direction === "down") row.reduced += 1;
    else row.flat += 1;
    // weight the % change by spend so big-volume items dominate
    const spend = s.latestPrice * s.totalQty;
    row.weightedChange += s.changeFromFirst * spend;
    row.weight += spend;
    row.costImpact += s.costImpact;
  });

  return Object.values(bySupplier)
    .map((r) => ({
      ...r,
      avgChange: r.weight ? r.weightedChange / r.weight : 0,
    }))
    .sort((a, b) => b.avgChange - a.avgChange);
}