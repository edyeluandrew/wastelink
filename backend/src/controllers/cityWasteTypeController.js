import { sendSuccess, sendError } from '../utils/apiResponse.js';
import {
  listCityWasteTypes,
  createCityWasteType,
  updateCityWasteType,
  getCityWasteTypeById,
  getCityWasteTypeHistory,
  getActiveCityWasteTypeForLog,
  calculateEarningFromCityWasteType,
} from '../services/wasteTypeGovernanceService.js';
import { canManageCity, normalizeCity, resolveUserCity } from '../utils/cityScope.js';
import { stripPickerWasteTypeFields } from '../utils/pickerResponseSanitizer.js';

const resolveListCity = (req) => {
  if (req.user.role === 'SUPER_ADMIN') {
    return req.query.city ? normalizeCity(req.query.city) : null;
  }
  return resolveUserCity(req.user);
};

export const getCityWasteTypes = async (req, res) => {
  try {
    const city = resolveListCity(req);
    const activeOnly = req.query.active === 'true';
    const items = await listCityWasteTypes({
      city,
      activeOnly,
      includeInactive: !activeOnly,
    });
    sendSuccess(res, 'City waste types retrieved', items);
  } catch (error) {
    console.error('[City Waste Types List]', error);
    sendError(res, error.message || 'Failed to load city waste types', error.status || 500);
  }
};

export const getActiveCityWasteTypes = async (req, res) => {
  try {
    const city = req.query.city
      ? normalizeCity(req.query.city)
      : resolveUserCity(req.user) || normalizeCity(process.env.DEFAULT_CITY);

    const items = await listCityWasteTypes({ city, activeOnly: true });
    const isPicker = req.user?.role === 'PICKER';
    const payload = isPicker ? items.map(stripPickerWasteTypeFields) : items;
    sendSuccess(res, 'Active city waste types retrieved', payload);
  } catch (error) {
    console.error('[Active City Waste Types]', error);
    sendError(res, error.message || 'Failed to load active city waste types', error.status || 500);
  }
};

export const estimateCityWasteTypeEarning = async (req, res) => {
  try {
    const cityWasteTypeId = parseInt(req.query.city_waste_type_id, 10);
    const estimatedKg = parseFloat(req.query.estimated_kg);

    if (!Number.isFinite(cityWasteTypeId) || cityWasteTypeId <= 0) {
      return sendError(res, 'city_waste_type_id is required', 400);
    }
    if (!Number.isFinite(estimatedKg) || estimatedKg <= 0) {
      return sendError(res, 'estimated_kg must be greater than 0', 400);
    }

    const city = req.query.city
      ? normalizeCity(req.query.city)
      : resolveUserCity(req.user) || normalizeCity(process.env.DEFAULT_CITY);

    const cityWasteType = await getActiveCityWasteTypeForLog(cityWasteTypeId, city);
    if (!cityWasteType) {
      return sendError(res, 'Selected waste type is not active', 404);
    }

    const { amount } = calculateEarningFromCityWasteType(cityWasteType, estimatedKg);

    sendSuccess(res, 'Estimated earning calculated', {
      estimated_amount: amount,
      is_estimate: true,
      is_payable: cityWasteType.is_payable,
    });
  } catch (error) {
    console.error('[Estimate City Waste Type Earning]', error);
    sendError(res, error.message || 'Failed to estimate earning', error.status || 500);
  }
};

export const getCityWasteType = async (req, res) => {
  try {
    const item = await getCityWasteTypeById(req.params.id);
    if (!item) return sendError(res, 'City waste type not found', 404);

    if (req.user.role === 'CITY_ADMIN' && !canManageCity(req.user, item.city)) {
      return sendError(res, 'Forbidden', 403);
    }

    sendSuccess(res, 'City waste type retrieved', item);
  } catch (error) {
    console.error('[City Waste Type Get]', error);
    sendError(res, error.message || 'Failed to load city waste type', error.status || 500);
  }
};

export const createCityWasteTypeHandler = async (req, res) => {
  try {
    const {
      city,
      name,
      description,
      reporting_category_id,
      price_per_kg = 0,
      is_payable = true,
      is_active = true,
    } = req.body || {};

    if (!name?.trim()) return sendError(res, 'name is required', 400);
    if (!reporting_category_id) return sendError(res, 'reporting_category_id is required', 400);

    const targetCity =
      req.user.role === 'SUPER_ADMIN'
        ? normalizeCity(city || resolveUserCity(req.user))
        : resolveUserCity(req.user);

    if (!canManageCity(req.user, targetCity)) {
      return sendError(res, 'Forbidden: cannot manage waste types for this city', 403);
    }

    const item = await createCityWasteType({
      city: targetCity,
      name,
      description,
      reportingCategoryId: parseInt(reporting_category_id, 10),
      pricePerKg: parseFloat(price_per_kg) || 0,
      isPayable: Boolean(is_payable),
      isActive: Boolean(is_active),
      changedBy: req.user.id,
    });

    sendSuccess(res, 'City waste type created', item, 201);
  } catch (error) {
    console.error('[City Waste Type Create]', error);
    if (error.code === '23505') return sendError(res, 'A waste type with this name already exists in this city', 409);
    sendError(res, error.message || 'Failed to create city waste type', error.status || 500);
  }
};

export const updateCityWasteTypeHandler = async (req, res) => {
  try {
    const existing = await getCityWasteTypeById(req.params.id);
    if (!existing) return sendError(res, 'City waste type not found', 404);

    if (!canManageCity(req.user, existing.city)) {
      return sendError(res, 'Forbidden: cannot manage waste types for this city', 403);
    }

    const {
      name,
      description,
      reporting_category_id,
      price_per_kg,
      is_payable,
      is_active,
      reason,
    } = req.body || {};

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (reporting_category_id !== undefined) updates.reporting_category_id = parseInt(reporting_category_id, 10);
    if (price_per_kg !== undefined) updates.price_per_kg = parseFloat(price_per_kg) || 0;
    if (is_payable !== undefined) updates.is_payable = Boolean(is_payable);
    if (is_active !== undefined) updates.is_active = Boolean(is_active);

    const item = await updateCityWasteType(existing.id, updates, {
      changedBy: req.user.id,
      reason,
    });

    sendSuccess(res, 'City waste type updated', item);
  } catch (error) {
    console.error('[City Waste Type Update]', error);
    sendError(res, error.message || 'Failed to update city waste type', error.status || 500);
  }
};

export const getCityWasteTypeHistoryHandler = async (req, res) => {
  try {
    const existing = await getCityWasteTypeById(req.params.id);
    if (!existing) return sendError(res, 'City waste type not found', 404);

    if (req.user.role === 'CITY_ADMIN' && !canManageCity(req.user, existing.city)) {
      return sendError(res, 'Forbidden', 403);
    }

    const history = await getCityWasteTypeHistory(existing.id);
    sendSuccess(res, 'City waste type history retrieved', history);
  } catch (error) {
    console.error('[City Waste Type History]', error);
    sendError(res, error.message || 'Failed to load history', error.status || 500);
  }
};
