/**
 * Remove per-kg pricing from responses shown to pickers.
 * Pickers see estimated/actual totals only — not rate cards.
 */
export const stripPickerPricingFields = (payload) => {
  if (!payload || typeof payload !== 'object') return payload;

  if (Array.isArray(payload)) {
    return payload.map(stripPickerPricingFields);
  }

  const next = { ...payload };
  delete next.estimated_rate_per_kg;
  delete next.city_price_per_kg;
  delete next.price_per_kg;
  delete next.price_per_kg_snapshot;

  if (next.earning && typeof next.earning === 'object') {
    const earning = { ...next.earning };
    delete earning.rate_per_kg;
    next.earning = earning;
  }

  delete next.rate_per_kg;

  return next;
};

export const stripPickerWasteTypeFields = (item) => {
  if (!item || typeof item !== 'object') return item;
  const next = { ...item };
  delete next.price_per_kg;
  return next;
};

export default {
  stripPickerPricingFields,
  stripPickerWasteTypeFields,
};
