import { HttpError } from './http-error.js';

export function requireAuth(request) {
  if (process.env.REQUIRE_AUTH !== 'true') {
    return;
  }

  const authHeader =
    request.headers.get('authorization') ||
    request.headers.get('x-api-token') ||
    '';
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : authHeader;
  const expected = process.env.API_TOKEN;

  if (!token || (expected && token !== expected)) {
    throw new HttpError(401, 'Unauthorized');
  }
}
