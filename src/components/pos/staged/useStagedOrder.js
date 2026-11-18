import { useState, useMemo } from "react";

/**
 * Cart state for "staged" POS screens (Call Center / Captain) — orders that are
 * submitted for cashier approval instead of being paid on the spot.
 */
export function useStagedOrder() {
  const [items, setItems] = useState([]);

  const addItem = (menuItem) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.menu_item_id === menuItem.id);
      if (existing) {
        return prev.map((i) => (i.menu_item_id === menuItem.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { menu_item_id: menuItem.id, name: menuItem.name, price: menuItem.price || 0, quantity: 1, comment: "" }];
    });
  };

  const changeQty = (id, delta) => {
    setItems((prev) =>
      prev
        .map((i) => (i.menu_item_id === id ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0)
    );
  };

  const removeItem = (id) => setItems((prev) => prev.filter((i) => i.menu_item_id !== id));
  const setComment = (id, comment) => setItems((prev) => prev.map((i) => (i.menu_item_id === id ? { ...i, comment } : i)));
  const clear = () => setItems([]);

  const subtotal = useMemo(() => items.reduce((sum, i) => sum + i.price * i.quantity, 0), [items]);
  const summary = useMemo(() => items.map((i) => `${i.quantity}× ${i.name}`).join(", "), [items]);

  return { items, addItem, changeQty, removeItem, setComment, clear, subtotal, summary };
}