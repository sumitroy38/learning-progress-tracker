// The limit is lowered before the app loads, so the test needs only a few tries
process.env.LOGIN_RATE_LIMIT = '3';

const { pool, resetDb, newClient } = require('./helpers');

beforeEach(resetDb);
afterAll(() => pool.end());

test('blocks login attempts after too many tries', async () => {
  const client = newClient();
  const attempt = () =>
    client.post('/api/v1/auth/login', { email: 'nobody@example.com', password: 'wrong-password' });

  for (let i = 0; i < 3; i += 1) {
    const res = await attempt();
    expect(res.status).toBe(401);
  }

  const blocked = await attempt();
  expect(blocked.status).toBe(429);
  expect(blocked.body.message).toMatch(/too many/i);
});