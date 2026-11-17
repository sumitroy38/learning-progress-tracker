const crypto = require('crypto');
require('dotenv').config({ quiet: true });

const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl) {
  throw new Error('TEST_DATABASE_URL is missing in server/.env');
}

// Safety: tests erase data, so the database name must contain "test"
const databaseName = new URL(testUrl).pathname.replace('/', '');
if (!databaseName.toLowerCase().includes('test')) {
  throw new Error(`Refusing to run tests on "${databaseName}". The name must contain "test".`);
}

process.env.DATABASE_URL = testUrl;
process.env.LOGIN_RATE_LIMIT = '1000';
// A random secret made for each run, so no secret is written in the code
process.env.SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');