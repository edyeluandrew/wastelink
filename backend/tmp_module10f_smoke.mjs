const base = 'https://wastelink-3lgu.onrender.com/api';
const now = Date.now();
const superEmail = process.env.SUPER_ADMIN_EMAIL;
const superPassword = process.env.SUPER_ADMIN_PASSWORD;
const cityEmail = `cityadmin-${now}@example.com`;
const cityPhone = `070100${String(now).slice(-4)}`;
const agentEmail = `agent-${now}@example.com`;
const agentPhone = `071100${String(now).slice(-4)}`;
const pickerEmail = `picker-${now}@example.com`;
const pickerPhone = `072100${String(now).slice(-4)}`;

const parseJson = async (res) => {
  const text = await res.text();
  try {
    return { status: res.status, body: JSON.parse(text) };
  } catch {
    return { status: res.status, body: { raw: text } };
  }
};

const api = async (path, options = {}, token) => {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${base}${path}`, {
    ...options,
    headers,
  });

  return parseJson(res);
};

const must = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const superLogin = await api('/auth/login', {
  method: 'POST',
  body: JSON.stringify({ email: superEmail, password: superPassword }),
});
must(superLogin.body?.data?.token, `super login failed: ${JSON.stringify(superLogin)}`);
const superToken = superLogin.body.data.token;
const superUser = superLogin.body.data.user;

const collectionPoints = await api('/collection-points', {}, superToken);
const pickers = await api('/pickers', {}, superToken);
must(Array.isArray(collectionPoints.body?.data) && collectionPoints.body.data.length > 0, 'no collection points');
must(Array.isArray(pickers.body?.data) && pickers.body.data.length > 0, 'no pickers');
const collectionPointId = collectionPoints.body.data[0].id;
const pickerProfile = pickers.body.data[0];

const cityCreate = await api('/users', {
  method: 'POST',
  body: JSON.stringify({
    name: 'City Admin Smoke',
    email: cityEmail,
    phone: cityPhone,
    password: 'CityAdmin123!',
    role: 'CITY_ADMIN',
    city: 'Kampala',
    status: 'ACTIVE',
  }),
}, superToken);
must(cityCreate.status < 300, `city admin create failed: ${JSON.stringify(cityCreate)}`);

const cityLogin = await api('/auth/login', {
  method: 'POST',
  body: JSON.stringify({ email: cityEmail, password: 'CityAdmin123!' }),
});
must(cityLogin.body?.data?.token, `city login failed: ${JSON.stringify(cityLogin)}`);
const cityToken = cityLogin.body.data.token;

const cityAgentCreate = await api('/users', {
  method: 'POST',
  body: JSON.stringify({
    name: 'City Agent Smoke',
    email: agentEmail,
    phone: agentPhone,
    password: 'Agent123!',
    role: 'AGENT',
    city: 'Kampala',
    division: 'Central',
    collection_point_id: collectionPointId,
    status: 'ACTIVE',
  }),
}, cityToken);
must(cityAgentCreate.status < 300, `city agent create failed: ${JSON.stringify(cityAgentCreate)}`);

const cityPickerCreate = await api('/users', {
  method: 'POST',
  body: JSON.stringify({
    name: 'City Picker Smoke',
    email: pickerEmail,
    phone: pickerPhone,
    password: 'Picker123!',
    role: 'PICKER',
    city: 'Kampala',
    division: 'Central',
    picker_id: pickerProfile.id,
    status: 'ACTIVE',
  }),
}, cityToken);
must(cityPickerCreate.status < 300, `city picker create failed: ${JSON.stringify(cityPickerCreate)}`);

const forbiddenCreateSuper = await api('/users', {
  method: 'POST',
  body: JSON.stringify({
    name: 'Bad Super',
    email: `bad-super-${now}@example.com`,
    phone: `073100${String(now).slice(-4)}`,
    password: 'Bad123!',
    role: 'SUPER_ADMIN',
    city: 'Kampala',
    status: 'ACTIVE',
  }),
}, cityToken);

const forbiddenCreateCity = await api('/users', {
  method: 'POST',
  body: JSON.stringify({
    name: 'Bad City',
    email: `bad-city-${now}@example.com`,
    phone: `074100${String(now).slice(-4)}`,
    password: 'Bad123!',
    role: 'CITY_ADMIN',
    city: 'Kampala',
    status: 'ACTIVE',
  }),
}, cityToken);

const forbiddenUpdateSuper = await api(`/users/${superUser.id}`, {
  method: 'PATCH',
  body: JSON.stringify({ status: 'INACTIVE' }),
}, cityToken);
const forbiddenDeactivateSuper = await api(`/users/${superUser.id}/deactivate`, { method: 'PATCH' }, cityToken);
const forbiddenResetSuper = await api(`/users/${superUser.id}/reset-password`, {
  method: 'PATCH',
  body: JSON.stringify({ password: 'Nope123!' }),
}, cityToken);

const agentLogin = await api('/auth/login', {
  method: 'POST',
  body: JSON.stringify({ email: agentEmail, password: 'Agent123!' }),
});
const pickerLogin = await api('/auth/login', {
  method: 'POST',
  body: JSON.stringify({ email: pickerEmail, password: 'Picker123!' }),
});

const agentUsers = await api('/users', {}, agentLogin.body?.data?.token);
const pickerUsers = await api('/users', {}, pickerLogin.body?.data?.token);
const sampleUsers = await api('/users', {}, superToken);
const containsPasswordHash = JSON.stringify(sampleUsers.body).includes('password_hash');

console.log(JSON.stringify({
  superLogin: superLogin.status,
  cityCreate: cityCreate.status,
  cityLogin: cityLogin.status,
  cityAgentCreate: cityAgentCreate.status,
  cityPickerCreate: cityPickerCreate.status,
  forbiddenCreateSuper: forbiddenCreateSuper.status,
  forbiddenCreateCity: forbiddenCreateCity.status,
  forbiddenUpdateSuper: forbiddenUpdateSuper.status,
  forbiddenDeactivateSuper: forbiddenDeactivateSuper.status,
  forbiddenResetSuper: forbiddenResetSuper.status,
  agentUsers: agentUsers.status,
  pickerUsers: pickerUsers.status,
  containsPasswordHash,
  cityToken,
  superToken,
}, null, 2));
