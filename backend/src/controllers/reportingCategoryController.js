import {
  listReportingCategories,
  upsertReportingCategory,
} from '../services/wasteTypeGovernanceService.js';
import { slugify } from '../utils/cityScope.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

export const getReportingCategories = async (req, res) => {
  try {
    const activeOnly = req.query.active === 'true';
    const categories = await listReportingCategories({ activeOnly });
    sendSuccess(res, 'Reporting categories retrieved', categories);
  } catch (error) {
    console.error('[Reporting Categories List]', error);
    sendError(res, error.message || 'Failed to load reporting categories', error.status || 500);
  }
};

export const createReportingCategory = async (req, res) => {
  try {
    const { name, slug, description, is_active = true } = req.body || {};
    if (!name?.trim()) return sendError(res, 'name is required', 400);

    const category = await upsertReportingCategory({
      name: name.trim(),
      slug: slug?.trim() || slugify(name),
      description,
      isActive: Boolean(is_active),
    });

    sendSuccess(res, 'Reporting category saved', category, 201);
  } catch (error) {
    console.error('[Reporting Category Create]', error);
    sendError(res, error.message || 'Failed to save reporting category', error.status || 500);
  }
};

export const updateReportingCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, slug, description, is_active } = req.body || {};
    if (!name?.trim()) return sendError(res, 'name is required', 400);

    const category = await upsertReportingCategory({
      id: parseInt(id, 10),
      name: name.trim(),
      slug: slug?.trim() || slugify(name),
      description,
      isActive: is_active !== undefined ? Boolean(is_active) : true,
    });

    sendSuccess(res, 'Reporting category updated', category);
  } catch (error) {
    console.error('[Reporting Category Update]', error);
    sendError(res, error.message || 'Failed to update reporting category', error.status || 500);
  }
};
