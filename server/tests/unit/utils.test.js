const { parseId, generateTempPassword } = require('../../src/utils');

describe('parseId', () => {
  test.each([
    ['1', 1],
    ['42', 42],
    ['2147483647', 2147483647],
  ])('accepts %p', (input, expected) => {
    expect(parseId(input)).toBe(expected);
  });

  test.each([['0'], ['-1'], ['1.5'], ['abc'], [''], ['2147483648'], ['1 OR 1=1']])(
    'rejects %p',
    (input) => {
      expect(parseId(input)).toBeNull();
    }
  );
});

describe('generateTempPassword', () => {
  test('is at least 10 characters long', () => {
    expect(generateTempPassword().length).toBeGreaterThanOrEqual(10);
  });

  test('is different every time', () => {
    expect(generateTempPassword()).not.toBe(generateTempPassword());
  });

  test('uses only safe characters', () => {
    expect(generateTempPassword()).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});