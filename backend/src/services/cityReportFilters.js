import { canManageCity, normalizeCity, resolveUserCity } from '../utils/cityScope.js';

export const DEFAULT_PILOT_CITY = normalizeCity(process.env.DEFAULT_CITY || 'mbarara');

export const formatCityLabel = (city) =>
  String(city || DEFAULT_PILOT_CITY)
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

export const parseReportPeriod = (query = {}) => {
  const { month, start_date, end_date } = query;

  if (start_date && end_date) {
    return {
      reportMonth: null,
      startDate: start_date,
      endDate: end_date,
      periodLabel: `${start_date} to ${end_date}`,
    };
  }

  let monthParam = month;
  if (!monthParam) {
    const now = new Date();
    monthParam = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  const [year, part] = monthParam.split('-');
  const startDate = `${year}-${part}-01`;
  const endDate = new Date(Number(year), Number(part), 0).toISOString().split('T')[0];

  return {
    reportMonth: monthParam,
    startDate,
    endDate,
    periodLabel: monthParam,
  };
};

export const resolveReportCity = (user, requestedCity) => {
  if (!user) {
    throw Object.assign(new Error('Authentication required'), { status: 401 });
  }

  if (user.role === 'CITY_ADMIN') {
    const city = resolveUserCity(user);
    if (requestedCity && normalizeCity(requestedCity) !== city) {
      throw Object.assign(new Error('Forbidden: cannot export data for another city'), { status: 403 });
    }
    return city;
  }

  if (user.role === 'SUPER_ADMIN') {
    return normalizeCity(requestedCity || DEFAULT_PILOT_CITY);
  }

  throw Object.assign(new Error('Forbidden: admin access required'), { status: 403 });
};

export const assertCanExportCity = (user, city) => {
  if (!canManageCity(user, city)) {
    throw Object.assign(new Error('Forbidden: cannot export data for this city'), { status: 403 });
  }
};

export const parseReportFilters = (query, user) => {
  const city = resolveReportCity(user, query.city);
  assertCanExportCity(user, city);
  const period = parseReportPeriod(query);

  const filters = {
    city,
    cityLabel: formatCityLabel(city),
    ...period,
    collectionPointId: query.collection_point_id ? parseInt(query.collection_point_id, 10) : null,
    cityWasteTypeId: query.city_waste_type_id ? parseInt(query.city_waste_type_id, 10) : null,
    wasteType: query.waste_type ? String(query.waste_type).trim() : null,
    gender: query.gender ? String(query.gender).trim().toLowerCase() : null,
    youthOnly: ['1', 'true', 'yes'].includes(String(query.youth_only || '').toLowerCase()),
  };

  if (filters.collectionPointId && !Number.isFinite(filters.collectionPointId)) {
    throw Object.assign(new Error('Invalid collection_point_id'), { status: 400 });
  }
  if (filters.cityWasteTypeId && !Number.isFinite(filters.cityWasteTypeId)) {
    throw Object.assign(new Error('Invalid city_waste_type_id'), { status: 400 });
  }

  return filters;
};

export const buildScopedLogSql = (filters, startParamIndex = 3) => {
  const params = [];
  const clauses = [];
  let idx = startParamIndex;

  params.push(filters.city);
  clauses.push(`(
    (cwt.id IS NOT NULL AND LOWER(cwt.city) = LOWER($${idx}))
    OR (
      wl.city_waste_type_id IS NULL
      AND EXISTS (
        SELECT 1 FROM city_waste_types cx
        WHERE LOWER(cx.city) = LOWER($${idx})
          AND (
            LOWER(TRIM(cx.name)) = LOWER(TRIM(wl.waste_type))
            OR LOWER(cx.slug) = LOWER(REPLACE(TRIM(wl.waste_type), ' ', '-'))
          )
      )
    )
  )`);
  idx += 1;

  if (filters.collectionPointId) {
    params.push(filters.collectionPointId);
    clauses.push(`wl.collection_point_id = $${idx}`);
    idx += 1;
  }

  if (filters.cityWasteTypeId) {
    params.push(filters.cityWasteTypeId);
    clauses.push(`wl.city_waste_type_id = $${idx}`);
    idx += 1;
  } else if (filters.wasteType) {
    params.push(filters.wasteType);
    clauses.push(`(
      LOWER(TRIM(wl.waste_type)) = LOWER(TRIM($${idx}))
      OR LOWER(TRIM(cwt.name)) = LOWER(TRIM($${idx}))
    )`);
    idx += 1;
  }

  if (filters.gender) {
    params.push(filters.gender);
    clauses.push(`LOWER(TRIM(p.gender)) = LOWER(TRIM($${idx}))`);
    idx += 1;
  }

  if (filters.youthOnly) {
    clauses.push(`p.age_group IN ('Below 18', '18-24', '25-35')`);
  }

  return {
    params,
    whereSql: clauses.length ? `AND ${clauses.join(' AND ')}` : '',
  };
};
