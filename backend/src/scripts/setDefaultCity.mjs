import dotenv from 'dotenv';
import pool from '../config/db.js';
import { getDefaultCityRecord } from '../services/cityService.js';

dotenv.config();

const slug = process.argv[2] || 'mbarara';

await pool.query('UPDATE cities SET is_default = FALSE');
await pool.query(
  `UPDATE cities SET is_default = TRUE, updated_at = NOW() WHERE LOWER(slug) = LOWER($1)`,
  [slug]
);
const def = await getDefaultCityRecord();
console.log('Default city now:', def.slug);
await pool.end();
