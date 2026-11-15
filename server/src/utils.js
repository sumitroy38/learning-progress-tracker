// Turns a URL id like "5" into the number 5. Returns null if it is not a valid id.
function parseId(value) {
  if (!/^\d+$/.test(value)) return null;
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1 || id > 2147483647) return null;
  return id;
}

module.exports = { parseId };