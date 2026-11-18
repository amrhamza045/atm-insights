import { useState } from "react";

// Cart state for staged (captain) orders — same line-item shape as the cashier POS
export function useCaptainCart() {
  const [cart, setCart] = useState([]);

  const addWithOptions = (itemWithOptions) => {
    const sizeMatch = (c) => (c.selectedSize?.name || null) === (itemWithOptions.selectedSize?.name || null);
    const existing = cart.find(c => c.id === itemWithOptions.id && sizeMatch(c) &&
      JSON.stringify(c.selectedOptions) === JSON.stringify(itemWithOptions.selectedOptions));

    if (existing) {
      setCart(cart.map(c => c._cartKey === existing._cartKey
        ? { ...c, quantity: c.quantity + itemWithOptions.quantity } : c));
      return;
    }

    const next = [...cart, { ...itemWithOptions, _cartKey: `${itemWithOptions.id}_reg_${Date.now()}` }];
    (itemWithOptions.optionalItems || []).forEach((optItem, idx) => {
      next.push({
        id: `${itemWithOptions.id}_opt_${optItem.itemOptionId}_${idx}`,
        _cartKey: `${itemWithOptions.id}_opt_${idx}_${Date.now()}`,
        name: `${optItem.optionName}: ${optItem.choices}`,
        price: optItem.priceModifier / (optItem.quantity || 1),
        quantity: (optItem.quantity || 1) * itemWithOptions.quantity,
        selectedOptions: {},
        optionPriceModifier: 0,
        optionsWithModifiers: {},
        isOptionalAddon: true
      });
    });
    setCart(next);
  };

  const updateQuantity = (cartKey, delta) => {
    setCart(prev => prev.flatMap(c => {
      if (c._cartKey !== cartKey) return [c];
      const qty = c.quantity + delta;
      return qty <= 0 ? [] : [{ ...c, quantity: qty }];
    }));
  };

  const removeItem = (cartKey) => setCart(prev => prev.filter(c => c._cartKey !== cartKey));
  const setComment = (cartKey, comment) => setCart(prev => prev.map(c => c._cartKey === cartKey ? { ...c, comment } : c));
  const clear = () => setCart([]);

  const subtotal = cart.reduce((sum, i) => sum + (i.price * i.quantity) + ((i.optionPriceModifier || 0) * i.quantity), 0);

  return { cart, addWithOptions, updateQuantity, removeItem, setComment, clear, subtotal };
}