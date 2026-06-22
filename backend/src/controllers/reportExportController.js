import { sendSuccess, sendError } from '../utils/apiResponse.js';
import {
  buildCityReportPack,
  getReportFilterOptions,
  listReportCities,
  previewCityReportExport,
} from '../services/cityReportService.js';
import { generateCityReportXlsx } from '../services/cityReportXlsxService.js';
import { generateCityReportPdf } from '../services/cityReportPdfService.js';
import { DEFAULT_PILOT_CITY, resolveReportCity } from '../services/cityReportFilters.js';

const buildExportQuery = (req) => req.query;

export const getReportExportMeta = async (req, res, next) => {
  try {
    const user = req.user;
    if (!user || !['SUPER_ADMIN', 'CITY_ADMIN'].includes(user.role)) {
      return sendError(res, 'Forbidden: admin access required', 403);
    }

    const city = resolveReportCity(user, req.query.city);
    const [cities, filterOptions] = await Promise.all([
      user.role === 'SUPER_ADMIN' ? listReportCities() : Promise.resolve([city]),
      getReportFilterOptions(city),
    ]);

    sendSuccess(res, 'Report export metadata loaded', {
      default_city: DEFAULT_PILOT_CITY,
      city,
      cities: cities.length ? cities : [city],
      filter_options: filterOptions,
    });
  } catch (error) {
    if (error.status) return sendError(res, error.message, error.status);
    next(error);
  }
};

export const getReportExportPreview = async (req, res, next) => {
  try {
    const user = req.user;
    if (!user || !['SUPER_ADMIN', 'CITY_ADMIN'].includes(user.role)) {
      return sendError(res, 'Forbidden: admin access required', 403);
    }

    const preview = await previewCityReportExport(buildExportQuery(req), user);
    sendSuccess(res, 'Report export preview loaded', preview);
  } catch (error) {
    if (error.status) return sendError(res, error.message, error.status);
    next(error);
  }
};

export const downloadCityReportXlsx = async (req, res, next) => {
  try {
    const user = req.user;
    if (!user || !['SUPER_ADMIN', 'CITY_ADMIN'].includes(user.role)) {
      return sendError(res, 'Forbidden: admin access required', 403);
    }

    const pack = await buildCityReportPack(buildExportQuery(req), user);
    const { buffer, filename } = await generateCityReportXlsx(pack);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (error) {
    if (error.status) return sendError(res, error.message, error.status);
    next(error);
  }
};

export const downloadCityReportPdf = async (req, res, next) => {
  try {
    const user = req.user;
    if (!user || !['SUPER_ADMIN', 'CITY_ADMIN'].includes(user.role)) {
      return sendError(res, 'Forbidden: admin access required', 403);
    }

    const pack = await buildCityReportPack(buildExportQuery(req), user);
    const { buffer, filename } = await generateCityReportPdf(pack);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (error) {
    if (error.status) return sendError(res, error.message, error.status);
    next(error);
  }
};
