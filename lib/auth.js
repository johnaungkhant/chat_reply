const { createHash, timingSafeEqual } = require('node:crypto');

function isAuthorized(request) {
  const expected = process.env.APP_PASSWORD;
  if (!expected) return false;

  const encodedPassword = request.headers['x-app-password-base64'];
  if (typeof encodedPassword !== 'string') return false;

  let supplied;
  try {
    supplied = Buffer.from(encodedPassword, 'base64').toString('utf8');
  } catch {
    return false;
  }

  const expectedHash = createHash('sha256').update(expected).digest();
  const suppliedHash = createHash('sha256').update(supplied).digest();
  return timingSafeEqual(expectedHash, suppliedHash);
}

module.exports = { isAuthorized };