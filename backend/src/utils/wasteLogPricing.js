import { calculateEarningFromCityWasteType } from '../services/wasteTypeGovernanceService.js';
import { calculateEarnings as calculateLegacyEarnings } from './calculateEarnings.js';

/**
 * Estimated earning for a PENDING log (picker's estimated kg × current city price).
 * Not withdrawable until agent verifies actual kg.
 */
export const computeEstimatedEarning = ({
  status,
  estimated_kg,
  waste_type,
  city_price_per_kg,
  city_is_payable,
}) => {
  if (status !== 'PENDING') {
    return null;
  }

  const kg = parseFloat(estimated_kg || 0);
  if (!Number.isFinite(kg) || kg <= 0) {
    return null;
  }

  if (city_price_per_kg != null || city_is_payable != null) {
    const { ratePerKg, amount } = calculateEarningFromCityWasteType(
      {
        price_per_kg: city_price_per_kg,
        is_payable: city_is_payable,
      },
      kg
    );
    return {
      estimated_rate_per_kg: ratePerKg,
      estimated_amount: amount,
      is_estimate: true,
    };
  }

  if (waste_type) {
    const { ratePerKg, amount } = calculateLegacyEarnings(waste_type, kg);
    return {
      estimated_rate_per_kg: ratePerKg,
      estimated_amount: amount,
      is_estimate: true,
    };
  }

  return null;
};

export const enrichWasteLogWithPricing = (wasteLog, row = null) => {
  const source = row || wasteLog;
  const estimate = computeEstimatedEarning({
    status: source.status,
    estimated_kg: source.estimated_kg,
    waste_type: source.waste_type,
    city_price_per_kg: source.city_price_per_kg,
    city_is_payable: source.city_is_payable,
  });

  if (!estimate) {
    return wasteLog;
  }

  return {
    ...wasteLog,
    ...estimate,
  };
};

export default {
  computeEstimatedEarning,
  enrichWasteLogWithPricing,
};
