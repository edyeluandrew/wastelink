/**
 * Module 16 USSD smoke tests
 * Run: npm run smoke:ussd-module16
 */
import { routeUssdRequest } from '../services/ussd/ussdService.js';
import pool from '../config/db.js';
import { getPhoneLookupVariants } from '../utils/phone.js';

const TEST_PHONE = '+256700000099';
const session = (text) => routeUssdRequest(text, TEST_PHONE);

const assert = (name, condition, detail = '') => {
  if (!condition) {
    throw new Error(`FAIL ${name}${detail ? `: ${detail}` : ''}`);
  }
  console.log(`PASS ${name}`);
};

async function cleanupTestPicker() {
  const variants = getPhoneLookupVariants(TEST_PHONE);
  const picker = await pool.query('SELECT id FROM pickers WHERE phone = ANY($1::text[]) LIMIT 1', [variants]);
  if (picker.rows.length === 0) return;

  const pickerId = picker.rows[0].id;
  await pool.query('DELETE FROM withdrawal_request_earnings WHERE withdrawal_request_id IN (SELECT id FROM withdrawal_requests WHERE picker_id = $1)', [pickerId]);
  await pool.query('DELETE FROM withdrawal_requests WHERE picker_id = $1', [pickerId]);
  await pool.query('DELETE FROM payment_status_history WHERE waste_log_id IN (SELECT id FROM waste_logs WHERE picker_id = $1)', [pickerId]);
  await pool.query('DELETE FROM earnings WHERE picker_id = $1', [pickerId]);
  await pool.query('DELETE FROM waste_logs WHERE picker_id = $1', [pickerId]);
  await pool.query('DELETE FROM users WHERE picker_id = $1', [pickerId]);
  await pool.query('DELETE FROM pickers WHERE id = $1', [pickerId]);
}

async function run() {
  console.log('[Module 16 USSD Smoke Tests]');
  await cleanupTestPicker();

  const mainMenu = await session('');
  assert('A main menu', mainMenu.startsWith('CON WasteLink Uganda') && mainMenu.includes('1. Register'));
  assert('A has withdraw', mainMenu.includes('5. Withdraw'));
  assert('A has help', mainMenu.includes('7. Help'));

  const unregisteredLog = await session('2');
  assert('B unregistered log waste', unregisteredLog.startsWith('END Please register first'));

  const regName = await session('1');
  assert('C register name prompt', regName.includes('Enter your full name'));

  const regCity = await session('1*Jane USSD Tester');
  assert('C register city prompt', regCity.includes('Kampala'));

  const regArea = await session('1*Jane USSD Tester*1');
  assert('C register area prompt', regArea.includes('area'));

  const regConfirm = await session('1*Jane USSD Tester*1*Bwaise');
  assert('C register confirm', regConfirm.includes('Confirm phone'));

  const regDone = await session('1*Jane USSD Tester*1*Bwaise*1');
  assert('C registration success', regDone.includes('Registration successful'));

  const dupReg = await session('1');
  assert('C duplicate registration blocked', dupReg.includes('already registered'));

  const wasteTypes = await session('2');
  assert('D log waste types', wasteTypes.includes('Select waste type'));

  const wasteKg = await session('2*1');
  assert('D log waste kg prompt', wasteKg.includes('weight in kg'));

  const wasteDivision = await session('2*1*5');
  assert('D log waste division', wasteDivision.includes('division'));

  const wastePoints = await session('2*1*5*1');
  assert('D log waste points', wastePoints.includes('collection point'));

  const wasteDone = await session('2*1*5*1*1');
  assert('D log waste success', wasteDone.includes('Waste logged successfully'));

  const status = await session('3');
  assert('E job status', status.includes('Recent Waste Logs') || status.includes('Pending'));

  const earnings = await session('4');
  assert('F earnings', earnings.includes('Available:') && earnings.includes('UGX'));

  const withdrawEmpty = await session('5');
  assert('G withdraw no balance or prompt', withdrawEmpty.includes('END') || withdrawEmpty.includes('Available balance'));

  const points = await session('6*1');
  assert('J collection points', points.includes('Points:') || points.includes('Kawempe'));

  const help = await session('7');
  assert('Help menu', help.includes('WasteLink Help'));

  const invalid = await session('9');
  assert('Invalid option', invalid.includes('Invalid option'));

  const withdrawTooMuch = await session('5*999999999');
  assert('I insufficient balance', withdrawTooMuch.includes('Insufficient balance'));

  console.log('\nAll Module 16 USSD smoke tests passed.');
  await pool.end();
}

run().catch(async (error) => {
  console.error(error.message || error);
  await pool.end().catch(() => {});
  process.exit(1);
});
