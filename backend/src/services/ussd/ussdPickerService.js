import pool from '../../config/db.js';
import { generatePickerCode, generateWasteJobCode } from '../../utils/generateCodes.js';
import { normalizePhoneNumber, getPhoneLookupVariants } from '../../utils/phone.js';
import { normalizeCity } from '../../utils/cityScope.js';
import {
  listCityWasteTypes,
  getActiveCityWasteTypeForLog,
  calculateEarningFromCityWasteType,
} from '../wasteTypeGovernanceService.js';
import { findCityDivisionByName } from '../divisionService.js';
import { computeEstimatedEarning } from '../../utils/wasteLogPricing.js';

const PILOT_CITY = normalizeCity(process.env.DEFAULT_CITY || 'mbarara');

const formatCityLabel = (city) =>
  String(city || PILOT_CITY)
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const CITY_OPTIONS = {
  '1': { label: formatCityLabel(PILOT_CITY), city: PILOT_CITY },
};

export const getCityOption = (key) => CITY_OPTIONS[key] || null;

export const findPickerByPhone = async (phoneNumber) => {
  const variants = getPhoneLookupVariants(phoneNumber);
  if (variants.length === 0) return null;

  const result = await pool.query(
    `SELECT id, picker_code, name, phone, division, status, main_waste_type
     FROM pickers
     WHERE phone = ANY($1::text[])
     LIMIT 1`,
    [variants]
  );

  return result.rows[0] || null;
};

export const isPickerRegistered = async (phoneNumber) => {
  const picker = await findPickerByPhone(phoneNumber);
  return Boolean(picker && picker.status === 'ACTIVE');
};

export const registerPickerFromUssd = async ({
  phoneNumber,
  name,
  divisionName,
  area,
}) => {
  const existing = await findPickerByPhone(phoneNumber);
  if (existing) {
    return { error: 'ALREADY_REGISTERED', picker: existing };
  }

  const trimmedName = String(name || '').trim();
  if (!trimmedName || trimmedName.length < 2) {
    return { error: 'INVALID_NAME' };
  }

  const divisionRecord = divisionName
    ? await findCityDivisionByName(PILOT_CITY, divisionName)
    : null;
  if (!divisionRecord) {
    return { error: 'INVALID_DIVISION' };
  }

  const normalizedPhone = normalizePhoneNumber(phoneNumber);
  const pickerCode = generatePickerCode();
  const areaNote = String(area || '').trim() || 'Not specified';

  const result = await pool.query(
    `INSERT INTO pickers (
      picker_code, name, phone, gender, age_group, division, main_waste_type, status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'ACTIVE')
    RETURNING id, picker_code, name, phone, division, status`,
    [
      pickerCode,
      trimmedName,
      normalizedPhone,
      'MALE',
      '25-35',
      divisionRecord.name,
      'MIXED_RECYCLABLES',
    ]
  );

  const picker = result.rows[0];

  return {
    picker,
    meta: { city: formatCityLabel(PILOT_CITY), division: divisionRecord.name, area: areaNote },
  };
};

export const getActiveWasteTypesForPicker = async (picker) => {
  const city = PILOT_CITY;
  const types = await listCityWasteTypes({ city, activeOnly: true });
  return types.slice(0, 7);
};

export const getCollectionPointsByDivision = async (division, city = PILOT_CITY) => {
  const result = await pool.query(
    `SELECT id, name, division, agent_name, agent_phone
     FROM collection_points
     WHERE LOWER(division) = LOWER($1)
       AND LOWER(COALESCE(city, $2)) = LOWER($2)
       AND status = 'ACTIVE'
     ORDER BY name ASC
     LIMIT 8`,
    [division, normalizeCity(city)]
  );
  return result.rows;
};

export const getRecentWasteLogsForPicker = async (pickerId, limit = 5) => {
  const result = await pool.query(
    `SELECT wl.id, wl.job_code, wl.waste_type, wl.estimated_kg, wl.verified_kg, wl.status, wl.logged_at,
            cwt.name AS city_waste_type_name, cwt.price_per_kg AS city_price_per_kg, cwt.is_payable AS city_is_payable
     FROM waste_logs wl
     LEFT JOIN city_waste_types cwt ON wl.city_waste_type_id = cwt.id
     WHERE wl.picker_id = $1
     ORDER BY wl.logged_at DESC
     LIMIT $2`,
    [pickerId, limit]
  );
  return result.rows.map((row) => {
    const estimate = computeEstimatedEarning(row);
    return estimate ? { ...row, ...estimate } : row;
  });
};

export const createUssdWasteLog = async ({
  pickerId,
  cityWasteTypeId,
  estimatedKg,
  collectionPointId,
  phoneNumber,
}) => {
  const city = PILOT_CITY;
  const cityWasteType = await getActiveCityWasteTypeForLog(cityWasteTypeId, city);
  if (!cityWasteType) {
    return { error: 'INVALID_WASTE_TYPE' };
  }

  const cpCheck = await pool.query(
    `SELECT id, name FROM collection_points WHERE id = $1 AND status = 'ACTIVE'`,
    [collectionPointId]
  );
  if (cpCheck.rows.length === 0) {
    return { error: 'INVALID_COLLECTION_POINT' };
  }

  const jobCode = generateWasteJobCode();
  const notes = `source=USSD; phone=${normalizePhoneNumber(phoneNumber)}`;

  const result = await pool.query(
    `INSERT INTO waste_logs (
      job_code, picker_id, collection_point_id, waste_type, city_waste_type_id,
      estimated_kg, status, notes
    ) VALUES ($1, $2, $3, $4, $5, $6, 'PENDING', $7)
    RETURNING id, job_code, status`,
    [
      jobCode,
      pickerId,
      collectionPointId,
      cityWasteType.name,
      cityWasteTypeId,
      estimatedKg,
      notes,
    ]
  );

  return {
    wasteLog: result.rows[0],
    estimate: calculateEarningFromCityWasteType(cityWasteType, estimatedKg),
  };
};

export { CITY_OPTIONS, PILOT_CITY, formatCityLabel };
