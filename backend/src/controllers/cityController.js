import { sendSuccess, sendError } from '../utils/apiResponse.js';
import {
  listCities,
  createCity,
  updateCity,
  getCityById,
  getDefaultCityRecord,
  assertCanManageCityRecord,
} from '../services/cityService.js';
import { formatCityLabel } from '../utils/cityScope.js';

export const getPublicCities = async (req, res, next) => {
  try {
    const pilotOnly = ['1', 'true', 'yes'].includes(String(req.query.pilot_only || '').toLowerCase());
    const cities = await listCities({ activeOnly: true, pilotOnly });
    const defaultCity = await getDefaultCityRecord();

    sendSuccess(res, 'Active cities loaded', {
      default_city: defaultCity.slug,
      default_city_label: formatCityLabel(defaultCity.slug),
      cities: cities.map((city) => ({
        id: city.id,
        name: city.name,
        slug: city.slug,
        is_pilot: city.is_pilot,
        is_default: city.is_default,
      })),
    });
  } catch (error) {
    next(error);
  }
};

export const getDefaultCity = async (req, res, next) => {
  try {
    const city = await getDefaultCityRecord();
    sendSuccess(res, 'Default city loaded', {
      city: city.slug,
      label: formatCityLabel(city.slug),
      record: city,
    });
  } catch (error) {
    next(error);
  }
};

export const getCities = async (req, res, next) => {
  try {
    const activeOnly = ['1', 'true', 'yes'].includes(String(req.query.active_only || '').toLowerCase());
    const cities = await listCities({ activeOnly });
    sendSuccess(res, 'Cities loaded', { cities });
  } catch (error) {
    next(error);
  }
};

export const createCityHandler = async (req, res, next) => {
  try {
    assertCanManageCityRecord(req.user);
    const city = await createCity({
      name: req.body.name,
      slug: req.body.slug,
      isPilot: req.body.is_pilot !== false,
      isDefault: Boolean(req.body.is_default),
    });
    sendSuccess(res, 'City created', { city }, 201);
  } catch (error) {
    if (error.code === '23505') return sendError(res, 'A city with this slug already exists', 409);
    if (error.status) return sendError(res, error.message, error.status);
    next(error);
  }
};

export const updateCityHandler = async (req, res, next) => {
  try {
    assertCanManageCityRecord(req.user);
    const existing = await getCityById(parseInt(req.params.id, 10));
    if (!existing) return sendError(res, 'City not found', 404);

    const city = await updateCity(existing.id, {
      name: req.body.name,
      status: req.body.status,
      isPilot: req.body.is_pilot,
      isDefault: req.body.is_default,
    });
    sendSuccess(res, 'City updated', { city });
  } catch (error) {
    if (error.status) return sendError(res, error.message, error.status);
    next(error);
  }
};
