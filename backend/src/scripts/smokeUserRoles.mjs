import { assert, getBaseUrl, login, requestJson, requireEnv } from './smokeHelpers.mjs';

const baseUrl = getBaseUrl();
const {
  SUPER_ADMIN_IDENTIFIER,
  SUPER_ADMIN_PASSWORD,
  CITY_ADMIN_IDENTIFIER,
  CITY_ADMIN_PASSWORD,
} = requireEnv([
  'SUPER_ADMIN_IDENTIFIER',
  'SUPER_ADMIN_PASSWORD',
  'CITY_ADMIN_IDENTIFIER',
  'CITY_ADMIN_PASSWORD',
]);

const superAdminSession = await login({
  baseUrl,
  identifier: SUPER_ADMIN_IDENTIFIER,
  password: SUPER_ADMIN_PASSWORD,
});

assert(String(superAdminSession.user.role || '').toUpperCase() === 'SUPER_ADMIN', 'Expected SUPER_ADMIN role');

const superUsersResponse = await requestJson(`${baseUrl}/users`, {
  token: superAdminSession.token,
});

assert(superUsersResponse.status === 200, `Expected super admin access to /users, got ${superUsersResponse.status}`);

const cityAdminSession = await login({
  baseUrl,
  identifier: CITY_ADMIN_IDENTIFIER,
  password: CITY_ADMIN_PASSWORD,
});

assert(String(cityAdminSession.user.role || '').toUpperCase() === 'CITY_ADMIN', 'Expected CITY_ADMIN role');

const cityUsersResponse = await requestJson(`${baseUrl}/users`, {
  token: cityAdminSession.token,
});

assert(cityUsersResponse.status === 200, `Expected city admin access to /users, got ${cityUsersResponse.status}`);

const forbiddenCreateResponse = await requestJson(`${baseUrl}/users`, {
  method: 'POST',
  token: cityAdminSession.token,
  body: {
    name: 'Forbidden Super Admin Smoke',
    email: 'forbidden.superadmin@example.invalid',
    password: 'SmokeTest1234',
    role: 'SUPER_ADMIN',
    status: 'ACTIVE',
  },
});

assert(forbiddenCreateResponse.status === 403, `Expected city admin to be blocked from creating SUPER_ADMIN, got ${forbiddenCreateResponse.status}`);

console.log('smokeUserRoles PASS');