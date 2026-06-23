import { listCityDivisions } from '../divisionService.js';
import { normalizeCity } from '../../utils/cityScope.js';

const PILOT_CITY = normalizeCity(process.env.DEFAULT_CITY || 'mbarara');

export const getUssdDivisions = async (city = PILOT_CITY) => {
  const divisions = await listCityDivisions({ city, activeOnly: true });
  const map = {};
  divisions.forEach((division, index) => {
    map[String(index + 1)] = division.name;
  });
  return { city: normalizeCity(city), divisions, map };
};

export const buildDivisionMenu = (map) => {
  const entries = Object.entries(map);
  if (!entries.length) {
    return null;
  }
  let menu = 'CON Select division:\n';
  entries.forEach(([key, label]) => {
    menu += `${key}. ${label}\n`;
  });
  menu += '0. Back';
  return menu.trimEnd();
};
