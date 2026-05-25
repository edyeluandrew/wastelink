import dotenv from 'dotenv';

dotenv.config();

export const getBaseUrl = () => {
  const baseUrl = process.env.BASE_URL || 'http://localhost:5000/api';
  return baseUrl.replace(/\/$/, '');
};

export const requireEnv = (keys) => {
  const missing = keys.filter((key) => !String(process.env[key] || '').trim());

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  return keys.reduce((accumulator, key) => {
    accumulator[key] = String(process.env[key]).trim();
    return accumulator;
  }, {});
};

export const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

export const requestJson = async (url, { method = 'GET', token, body } = {}) => {
  const headers = { 'Content-Type': 'application/json' };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await response.text();
  let data = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
  }

  return {
    status: response.status,
    ok: response.ok,
    data,
    text,
  };
};

export const login = async ({ baseUrl, identifier, password }) => {
  const result = await requestJson(`${baseUrl}/auth/login`, {
    method: 'POST',
    body: { identifier, password },
  });

  assert(result.status === 200, `Login failed with HTTP ${result.status}`);

  const token = result.data?.data?.token || null;
  const user = result.data?.data?.user || null;

  assert(token, 'Login response did not include a token');
  assert(user, 'Login response did not include a user');

  return { token, user, status: result.status };
};