const crypto = require('crypto');
const { doubleCsrf } = require('csrf-csrf');

const isProduction = process.env.NODE_ENV === 'production';

// Made from SESSION_SECRET, so .env keeps only one secret
const csrfSecret = () =>
  crypto.createHmac('sha256', process.env.SESSION_SECRET).update('csrf').digest('hex');

const { doubleCsrfProtection, generateCsrfToken, invalidCsrfTokenError } = doubleCsrf({
  getSecret: csrfSecret,
  getSessionIdentifier: (req) => req.session.id,
  cookieName: 'lpt.csrf',
  cookieOptions: { httpOnly: true, sameSite: 'lax', secure: isProduction, path: '/' },
  getCsrfTokenFromRequest: (req) => req.headers['x-csrf-token'],
  errorConfig: { statusCode: 403, message: 'Invalid CSRF token.', code: 'EBADCSRFTOKEN' },
});

module.exports = { doubleCsrfProtection, generateCsrfToken, invalidCsrfTokenError };