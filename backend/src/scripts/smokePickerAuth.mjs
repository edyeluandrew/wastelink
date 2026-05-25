import { assert, getBaseUrl, login, requestJson, requireEnv } from './smokeHelpers.mjs';

const baseUrl = getBaseUrl();
const { PICKER_IDENTIFIER, PICKER_PASSWORD } = requireEnv(['PICKER_IDENTIFIER', 'PICKER_PASSWORD']);

const session = await login({
  baseUrl,
  identifier: PICKER_IDENTIFIER,
  password: PICKER_PASSWORD,
});

assert(String(session.user.role || '').toUpperCase() === 'PICKER', 'Expected PICKER role');
assert(session.user.picker?.id, 'Expected a linked picker profile');

const meResponse = await requestJson(`${baseUrl}/auth/me`, {
  token: session.token,
});

assert(meResponse.status === 200, `Expected /auth/me to return 200, got ${meResponse.status}`);
assert(String(meResponse.data?.data?.user?.role || '').toUpperCase() === 'PICKER', 'Expected /auth/me to return PICKER role');
assert(meResponse.data?.data?.user?.picker?.id, 'Expected /auth/me to include a linked picker profile');

const usersResponse = await requestJson(`${baseUrl}/users`, {
  token: session.token,
});

assert(usersResponse.status === 403, `Expected picker access to /users to be blocked, got ${usersResponse.status}`);

console.log('smokePickerAuth PASS');