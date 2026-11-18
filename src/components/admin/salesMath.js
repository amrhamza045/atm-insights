// Single source of truth for sales financial math.
// Every order is broken down so that:
//   gross + tax + service + delivery + minCharge - declaredDiscount - otherAdjustments === total
// which makes the reconciliation always add up (no unexplained difference).

const n = (v) => (typeof v === 'number' && isFinite(v) ? v : 0);

export const itemsSum = (o) =>
  (o.items || []).reduce(
    (s, i) => s + (n(i.price) + n(i.option_price_modifier)) * (n(i.quantity) || 1),
    0
  );

export const orderFinancials = (o) => {
  const gross = n(o.subtotal) || itemsSum(o);
  const tax = n(o.tax);
  const service = n(o.service_charge);
  const delivery = n(o.delivery_fee);
  const minCharge = n(o.minimum_charge_adjustment);
  const declaredDiscount = n(o.discount_amount);
  const total = n(o.total);
  // Whatever is left after the declared promo discount: offers, manual discounts,
  // global discounts, rounding — derived, never guessed.
  const otherAdjustments =
    gross + tax + service + delivery + minCharge - declaredDiscount - total;
  return { gross, tax, service, delivery, minCharge, declaredDiscount, otherAdjustments, total };
};

const CATEGORY_OF = {
  cash: 'cash',
  visa: 'visa',
  cl: 'cl',
  hospitality: 'hospitality',
  instapay: 'instapay',
};

export const categorizePayment = (method) => CATEGORY_OF[method] || 'other';

// Split payments must not land entirely in one bucket.
export const paymentSplit = (o) => {
  const total = n(o.total);
  const m = o.payment_method || 'other';

  if (m === 'visa_cash' || m === 'visa_instapay') {
    const fallbackSecondary = m === 'visa_cash' ? 'cash' : 'instapay';
    const secondaryMethod = o.secondary_payment_method || fallbackSecondary;
    const visa = n(o.visa_amount);
    const secondary =
      o.secondary_amount != null ? n(o.secondary_amount) : Math.max(total - visa, 0);
    return [
      { method: 'visa', amount: visa || Math.max(total - secondary, 0) },
      { method: secondaryMethod, amount: secondary },
    ];
  }

  if (o.secondary_payment_method && n(o.secondary_amount) > 0) {
    return [
      { method: m, amount: Math.max(total - n(o.secondary_amount), 0) },
      { method: o.secondary_payment_method, amount: n(o.secondary_amount) },
    ];
  }

  return [{ method: m, amount: total }];
};