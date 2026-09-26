const { createHash, timingSafeEqual } = require('node:crypto');

function isAuthorized(request) {
  const expected = process.env.APP_PASSWORD;
  if (!expected) return false;

  const supplied = request.headers['x-app-password'];
  if (typeof supplied !== 'string') return false;

  const expectedHash = createHash('sha256').update(expected).digest();
  const suppliedHash = createHash('sha256').update(supplied).digest();
  return timingSafeEqual(expectedHash, suppliedHash);
}

module.exports = { isAuthorized };