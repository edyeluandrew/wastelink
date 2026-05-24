const baseUrl = process.env.BASE_URL;
import bcrypt from 'bcryptjs';
import pg from 'pg';

const testName = 'Picker Auth Smoke';
const testPhone = '0709001001';
const testPassword = 'SmokePass123!';
const secondPhone = '0709001002';
const adminEmail = process.env.SUPER_ADMIN_EMAIL;
const adminPassword = process.env.SUPER_ADMIN_PASSWORD;
const { Pool } = pg;

const dbPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 30000,
  idleTimeoutMillis: 60000,
  max: 5,
});

const readJson = async (response) => {
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  return { status: response.status, data, text };
};

const request = async (method, path, body, token) => {
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  return readJson(response);
};

const dbQuery = async (text, params) => dbPool.query(text, params);

const ensurePicker = async ({ name, phone, gender, ageGroup, division, mainWasteType }) => {
  const existing = await dbQuery(
    'SELECT id, picker_code, name, phone, gender, age_group, division, main_waste_type, status FROM pickers WHERE phone = $1 LIMIT 1',
    [phone]
  );

  if (existing.rows[0]) {
    return existing.rows[0];
  }

  const pickerCode = `SMOKE-${String(phone).replace(/\D/g, '').slice(-6)}`;
  const created = await dbQuery(
    `INSERT INTO pickers (picker_code, name, phone, gender, age_group, division, main_waste_type, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'ACTIVE')
     RETURNING id, picker_code, name, phone, gender, age_group, division, main_waste_type, status`,
    [pickerCode, name, phone, gender, ageGroup, division, mainWasteType]
  );

  return created.rows[0];
};

const ensurePickerUser = async ({ name, phone, password, pickerId }) => {
  const passwordHash = await bcrypt.hash(password, 12);
  const existing = await dbQuery(
    'SELECT id FROM users WHERE phone = $1 LIMIT 1',
    [phone]
  );

  if (existing.rows[0]) {
    const updated = await dbQuery(
      `UPDATE users
       SET name = $1, password_hash = $2, role = 'PICKER', picker_id = $3, status = 'ACTIVE', updated_at = NOW()
       WHERE id = $4
       RETURNING id`,
      [name, passwordHash, pickerId, existing.rows[0].id]
    );
    return updated.rows[0];
  }

  const created = await dbQuery(
    `INSERT INTO users (name, phone, password_hash, role, picker_id, status)
     VALUES ($1, $2, $3, 'PICKER', $4, 'ACTIVE')
     RETURNING id`,
    [name, phone, passwordHash, pickerId]
  );

  return created.rows[0];
};

const main = async () => {
  if (!baseUrl || !adminEmail || !adminPassword) {
    console.log('ENV_MISSING');
    process.exit(1);
  }

  const adminLogin = await request('POST', '/auth/login', { email: adminEmail, password: adminPassword });
  const adminToken = adminLogin.data?.data?.token;
  const usingApiAdmin = Boolean(adminToken);

  const pickersResp = await request('GET', '/pickers');
  const pickers = Array.isArray(pickersResp.data?.data) ? pickersResp.data.data : [];

  let testPicker = pickers.find((picker) => String(picker.phone) === testPhone);
  if (!testPicker) {
    if (usingApiAdmin) {
      const createPicker = await request('POST', '/pickers', {
        name: testName,
        phone: testPhone,
        gender: 'MALE',
        age_group: '25-35',
        division: 'Kawempe',
        main_waste_type: 'PLASTIC',
      });
      if (createPicker.status !== 201) {
        console.log(`CREATE_PICKER_FAIL code=${createPicker.status}`);
        process.exit(1);
      }
      testPicker = createPicker.data?.data;
      console.log(`PICKER_CREATED id=${testPicker.id}`);
    } else {
      testPicker = await ensurePicker({
        name: testName,
        phone: testPhone,
        gender: 'MALE',
        ageGroup: '25-35',
        division: 'Kawempe',
        mainWasteType: 'PLASTIC',
      });
      console.log(`PICKER_CREATED_DB id=${testPicker.id}`);
    }
  } else {
    console.log(`PICKER_REUSED id=${testPicker.id}`);
  }

  let users = [];
  if (usingApiAdmin) {
    const usersResp = await request('GET', '/users?role=PICKER', null, adminToken);
    users = Array.isArray(usersResp.data?.data) ? usersResp.data.data : [];
  } else {
    const dbUsers = await dbQuery('SELECT id, name, phone, picker_id, role, status FROM users WHERE phone = $1 LIMIT 1', [testPhone]);
    if (dbUsers.rows[0]) {
      users = [{ phone: dbUsers.rows[0].phone, id: dbUsers.rows[0].id, picker_id: dbUsers.rows[0].picker_id }];
    }
  }

  let testUser = users.find((user) => String(user.phone) === testPhone);
  if (!testUser) {
    if (usingApiAdmin) {
      const createUser = await request('POST', '/users', {
        name: testName,
        phone: testPhone,
        password: testPassword,
        role: 'PICKER',
        picker_id: testPicker.id,
        status: 'ACTIVE',
      }, adminToken);
      if (createUser.status !== 201) {
        console.log(`CREATE_USER_FAIL code=${createUser.status}`);
        process.exit(1);
      }
      testUser = createUser.data?.data;
      console.log(`USER_CREATED id=${testUser.id}`);
    } else {
      testUser = await ensurePickerUser({
        name: testName,
        phone: testPhone,
        password: testPassword,
        pickerId: testPicker.id,
      });
      console.log(`USER_CREATED_DB id=${testUser.id}`);
    }
  } else {
    console.log(`USER_REUSED id=${testUser.id}`);
  }

  let otherPicker = pickers.find((picker) => String(picker.phone) === secondPhone && String(picker.id) !== String(testPicker.id))
    || pickers.find((picker) => String(picker.id) !== String(testPicker.id));
  if (!otherPicker) {
    otherPicker = usingApiAdmin
      ? (await request('POST', '/pickers', {
          name: `${testName} B`,
          phone: secondPhone,
          gender: 'FEMALE',
          age_group: '25-35',
          division: 'Kawempe',
          main_waste_type: 'PLASTIC',
        })).data?.data
      : await ensurePicker({
          name: `${testName} B`,
          phone: secondPhone,
          gender: 'FEMALE',
          ageGroup: '25-35',
          division: 'Kawempe',
          mainWasteType: 'PLASTIC',
        });
    if (!otherPicker?.id) {
      console.log('OTHER_PICKER_CREATE_FAIL');
      process.exit(1);
    }
    console.log(`OTHER_PICKER_CREATED id=${otherPicker.id}`);
  }
  if (!otherPicker) {
    console.log('OTHER_PICKER_NOT_FOUND');
    process.exit(1);
  }

  const login = await request('POST', '/auth/login', { identifier: testPhone, password: testPassword });
  const loginUser = login.data?.data?.user || {};
  const pickerToken = login.data?.data?.token;
  if (!pickerToken) {
    console.log(`PICKER_LOGIN_FAIL code=${login.status} message=${login.data?.message || login.data?.error || 'unknown'}`);
    process.exit(1);
  }
  console.log(`PICKER_LOGIN code=${login.status} role=${loginUser.role || ''} picker_id=${loginUser.picker_id || ''} picker_obj=${loginUser.picker ? 'yes' : 'no'}`);

  const me = await request('GET', '/auth/me', null, pickerToken);
  const meUser = me.data?.data?.user || me.data?.data || {};
  const mePicker = meUser.picker || null;
  console.log(`AUTH_ME code=${me.status} role=${meUser.role || ''} picker_id=${meUser.picker_id || ''} picker_obj=${mePicker ? 'yes' : 'no'} password_hash_present=${Object.prototype.hasOwnProperty.call(meUser, 'password_hash') ? 'yes' : 'no'}`);

  const logsSelf = await request('GET', `/waste-logs?picker_id=${testPicker.id}`, null, pickerToken);
  const selfLogs = Array.isArray(logsSelf.data?.data) ? logsSelf.data.data : [];
  console.log(`PICKER_LOGS_SELF code=${logsSelf.status} count=${selfLogs.length}`);

  const logsOther = await request('GET', `/waste-logs?picker_id=${otherPicker.id}`, null, pickerToken);
  console.log(`PICKER_LOGS_OTHER code=${logsOther.status}`);

  const pointsResp = await request('GET', '/collection-points');
  const activePoint = Array.isArray(pointsResp.data?.data) ? pointsResp.data.data.find((point) => point.status === 'ACTIVE') : null;
  if (!activePoint) {
    console.log('ACTIVE_COLLECTION_POINT_NOT_FOUND');
    process.exit(1);
  }

  const createLog = await request('POST', '/waste-logs', {
    picker_id: otherPicker.id,
    collection_point_id: activePoint.id,
    waste_type: 'PLASTIC',
    estimated_kg: 5,
  }, pickerToken);
  const createdLog = createLog.data?.data || {};
  console.log(`CREATE_LOG code=${createLog.status} log_id=${createdLog.id || ''} picker_id=${createdLog.picker_id || ''} status=${createdLog.status || ''}`);

  const verify = await request('PATCH', `/waste-logs/${createdLog.id}/verify`, { verified_kg: 5 }, pickerToken);
  const reject = await request('PATCH', `/waste-logs/${createdLog.id}/reject`, { reason: 'test' }, pickerToken);
  const paid = await request('PATCH', `/waste-logs/${createdLog.id}/mark-paid`, null, pickerToken);
  console.log(`BLOCKS verify=${verify.status} reject=${reject.status} paid=${paid.status}`);

  console.log('SMOKE_DONE');

  await dbPool.end();
};

main().catch((error) => {
  console.log(`SMOKE_ERROR ${error?.message || error}`);
  process.exit(1);
});