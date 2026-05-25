import { assert, getBaseUrl, login, requestJson, requireEnv } from './smokeHelpers.mjs';

const baseUrl = getBaseUrl();
const { AGENT_IDENTIFIER, AGENT_PASSWORD } = requireEnv(['AGENT_IDENTIFIER', 'AGENT_PASSWORD']);

const session = await login({
  baseUrl,
  identifier: AGENT_IDENTIFIER,
  password: AGENT_PASSWORD,
});

assert(String(session.user.role || '').toUpperCase() === 'AGENT', 'Expected AGENT role');
assert(session.user.collection_point?.id, 'Expected an assigned collection point');

const meResponse = await requestJson(`${baseUrl}/auth/me`, {
  token: session.token,
});

assert(meResponse.status === 200, `Expected /auth/me to return 200, got ${meResponse.status}`);
assert(String(meResponse.data?.data?.user?.role || '').toUpperCase() === 'AGENT', 'Expected /auth/me to return AGENT role');
assert(meResponse.data?.data?.user?.collection_point?.id, 'Expected /auth/me to include an assigned collection point');

const usersResponse = await requestJson(`${baseUrl}/users`, {
  token: session.token,
});

assert(usersResponse.status === 403, `Expected agent access to /users to be blocked, got ${usersResponse.status}`);

console.log('smokeAgentAuth PASS');