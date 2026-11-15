const crypto = require('crypto');

// Turns a URL id like "5" into the number 5. Returns null if it is not a valid id.
function parseId(value) {
  if (!/^\d+$/.test(value)) return null;
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1 || id > 2147483647) return null;
  return id;
}

// Makes a random 12 character temporary password
function generateTempPassword() {
  return crypto.randomBytes(9).toString('base64url');
}

module.exports = { parseId, generateTempPassword };