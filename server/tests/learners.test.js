const {
  pool,
  resetDb,
  newClient,
  loginAsCoordinator,
  signedInCandidate,
  createCandidate,
  strongPassword,
} = require('./helpers');

beforeEach(resetDb);
afterAll(() => pool.end());

const LOGIN = '/api/v1/auth/login';
const HOUR = 60 * 60 * 1000;

const validBody = (overrides = {}) => ({
  name: 'Asha Verma',
  email: 'asha.verma@example.com',
  cohort: 'Cohort A',
  ...overrides,
});

describe('creating candidates', () => {
  test('creates a candidate and shows one time credentials', async () => {
    const coordinator = await loginAsCoordinator();
    const res = await coordinator.post('/api/v1/learners', validBody());

    expect(res.status).toBe(201);
    expect(res.body.learner).toEqual({
      id: expect.any(Number),
      name: 'Asha Verma',
      email: 'asha.verma@example.com',
      cohort: 'Cohort A',
    });
    expect(res.body.credentials.username).toBe('asha.verma@example.com');
    expect(res.body.credentials.temporaryPassword.length).toBeGreaterThanOrEqual(10);

    const hoursLeft = (new Date(res.body.credentials.expiresAt) - Date.now()) / HOUR;
    expect(hoursLeft).toBeGreaterThan(23);
    expect(hoursLeft).toBeLessThanOrEqual(24);
  });

  test('tells the browser not to keep the credentials', async () => {
    const coordinator = await loginAsCoordinator();
    const res = await coordinator.post('/api/v1/learners', validBody());
    expect(res.headers['cache-control']).toContain('no-store');
  });

  test('stores only a hash of the temporary password', async () => {
    const coordinator = await loginAsCoordinator();
    const res = await coordinator.post('/api/v1/learners', validBody());

    expect(JSON.stringify(res.body)).not.toContain('password_hash');
    const { rows } = await pool.query('SELECT password_hash FROM accounts WHERE email = $1', [
      'asha.verma@example.com',
    ]);
    expect(rows[0].password_hash).toMatch(/^\$2[aby]\$/);
    expect(rows[0].password_hash).not.toContain(res.body.credentials.temporaryPassword);
  });

  test('saves the email in lower case', async () => {
    const coordinator = await loginAsCoordinator();
    const res = await coordinator.post(
      '/api/v1/learners',
      validBody({ email: 'Mixed.Case@Example.com' })
    );
    expect(res.body.learner.email).toBe('mixed.case@example.com');
  });

  test('rejects a duplicate email', async () => {
    const coordinator = await loginAsCoordinator();
    await coordinator.post('/api/v1/learners', validBody());
    const res = await coordinator.post('/api/v1/learners', validBody({ name: 'Someone Else' }));
    expect(res.status).toBe(409);
    expect(res.body.message).toBe('An account with this email already exists.');
  });

  test('rejects a duplicate email written in other letter case', async () => {
    const coordinator = await loginAsCoordinator();
    await coordinator.post('/api/v1/learners', validBody());
    const res = await coordinator.post(
      '/api/v1/learners',
      validBody({ email: 'ASHA.VERMA@EXAMPLE.COM' })
    );
    expect(res.status).toBe(409);
  });

  test('saves nothing when the email is a duplicate', async () => {
    const coordinator = await loginAsCoordinator();
    await coordinator.post('/api/v1/learners', validBody());
    await coordinator.post('/api/v1/learners', validBody());

    const list = await coordinator.get('/api/v1/learners');
    expect(list.body).toHaveLength(1);
    // The coordinator account plus one candidate account, and no leftover account
    const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM accounts');
    expect(rows[0].n).toBe(2);
  });

  test.each([['name'], ['email'], ['cohort']])('requires %s', async (field) => {
    const coordinator = await loginAsCoordinator();
    const body = validBody();
    delete body[field];
    const res = await coordinator.post('/api/v1/learners', body);
    expect(res.status).toBe(400);
  });

  test('rejects an email that is not valid', async () => {
    const coordinator = await loginAsCoordinator();
    const res = await coordinator.post('/api/v1/learners', validBody({ email: 'not-an-email' }));
    expect(res.status).toBe(400);
  });

  test('lists learners without any password data', async () => {
    const coordinator = await loginAsCoordinator();
    await createCandidate(coordinator, 'Asha Verma');
    await createCandidate(coordinator, 'Ravi Menon');
    const res = await coordinator.get('/api/v1/learners');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(Object.keys(res.body[0]).sort()).toEqual(['cohort', 'email', 'id', 'name']);
  });

  test('does not let a candidate list learners, create accounts or reset passwords', async () => {
    const coordinator = await loginAsCoordinator();
    const candidate = await signedInCandidate(coordinator);

    expect((await candidate.client.get('/api/v1/learners')).status).toBe(403);
    const create = await candidate.client.post(
      '/api/v1/learners',
      validBody({ email: 'other@example.com' })
    );
    expect(create.status).toBe(403);
    const reset = await candidate.client.post(
      `/api/v1/learners/${candidate.learnerId}/reset-password`
    );
    expect(reset.status).toBe(403);

    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS n FROM accounts WHERE email = 'other@example.com'`
    );
    expect(rows[0].n).toBe(0);
  });

  test('does not let a signed out visitor create accounts', async () => {
    const res = await newClient().post('/api/v1/learners', validBody());
    expect(res.status).toBe(401);
  });
});

describe('password reset by the coordinator', () => {
  test('gives new temporary credentials, ends old sessions and repeats first login', async () => {
    const coordinator = await loginAsCoordinator();
    const candidate = await signedInCandidate(coordinator);

    const reset = await coordinator.post(`/api/v1/learners/${candidate.learnerId}/reset-password`);
    expect(reset.status).toBe(200);
    expect(reset.headers['cache-control']).toContain('no-store');
    const { temporaryPassword } = reset.body.credentials;
    expect(temporaryPassword).not.toBe(candidate.password);

    // The old session is gone and the old password no longer works
    expect((await candidate.client.get('/api/v1/auth/me')).status).toBe(401);
    const oldLogin = await newClient().post(LOGIN, {
      email: candidate.email,
      password: candidate.password,
    });
    expect(oldLogin.status).toBe(401);

    // The new temporary password works, and the candidate must change it again
    const newLogin = await newClient().post(LOGIN, {
      email: candidate.email,
      password: temporaryPassword,
    });
    expect(newLogin.status).toBe(200);
    expect(newLogin.body.mustChangePassword).toBe(true);
  });

  test('fixes an expired temporary password', async () => {
    const coordinator = await loginAsCoordinator();
    const candidate = await createCandidate(coordinator);
    await pool.query(
      `UPDATE accounts SET temp_password_expires_at = NOW() - INTERVAL '1 hour'
       WHERE LOWER(email) = LOWER($1)`,
      [candidate.email]
    );

    const expired = await newClient().post(LOGIN, {
      email: candidate.email,
      password: candidate.temporaryPassword,
    });
    expect(expired.status).toBe(401);

    const reset = await coordinator.post(`/api/v1/learners/${candidate.learnerId}/reset-password`);
    expect(reset.status).toBe(200);

    const fresh = await newClient().post(LOGIN, {
      email: candidate.email,
      password: reset.body.credentials.temporaryPassword,
    });
    expect(fresh.status).toBe(200);
  });

  test('answers 404 for a learner that does not exist', async () => {
    const coordinator = await loginAsCoordinator();
    const res = await coordinator.post('/api/v1/learners/9999/reset-password');
    expect(res.status).toBe(404);
  });

  test('keeps working after the candidate sets a new password', async () => {
    const coordinator = await loginAsCoordinator();
    const candidate = await createCandidate(coordinator);
    const client = newClient();
    await client.post(LOGIN, { email: candidate.email, password: candidate.temporaryPassword });
    const changed = await client.post('/api/v1/auth/change-password', {
      currentPassword: candidate.temporaryPassword,
      newPassword: strongPassword(),
    });
    expect(changed.status).toBe(204);
  });
});