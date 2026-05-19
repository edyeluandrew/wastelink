const RATES = {
  PLASTIC: 300,
  MIXED_RECYCLABLES: 200,
  ORGANIC: 70,
  E_WASTE: 700,
  METAL_CARDBOARD: 250,
};

export const calculateEarnings = (wasteType, verifiedKg) => {
  const ratePerKg = RATES[wasteType] || 0;
  const amount = ratePerKg * Number(verifiedKg || 0);

  return {
    ratePerKg,
    amount,
  };
};
