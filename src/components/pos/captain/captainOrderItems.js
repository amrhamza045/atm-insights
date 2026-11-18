// Flattens a captain cart into order_items where EVERY item is its own priced
// line — exactly like the cashier POS. Mandatory option choices (e.g. an extra
// Red Bull) used to be folded into the item name and lost their price, so the
// receipt total didn't add up. Now each option group becomes its own line
// carrying its own money.
export function buildCaptainOrderItems(cart) {
  const rows = [];
  cart.forEach((c) => {
    // Base line — name without the appended option lines, price without modifiers
    rows.push({
      menu_item_id: c.id,
      name: String(c.name || "").split("\n")[0],
      price: c.price || 0,
      quantity: c.quantity || 0,
      comment: c.comment || ""
    });

    // Each mandatory option group → its own line with its own price
    Object.entries(c.optionsWithModifiers || {}).forEach(([optId, opt]) => {
      const choices = Array.isArray(opt?.choices) ? opt.choices.join(", ") : (opt?.choices || "");
      if (!choices) return;
      rows.push({
        menu_item_id: `${c.id}_opt_${optId}`,
        name: opt?.optionName ? `${opt.optionName}: ${choices}` : choices,
        price: opt?.totalModifier || 0,
        quantity: c.quantity || 0,
        comment: ""
      });
    });
  });
  return rows;
}

// Items total = plain sum of the lines, so the receipt always reconciles.
export function sumOrderItems(items = []) {
  return items.reduce((s, it) => s + (it.price || 0) * (it.quantity || 0), 0);
}