const {
  pool,
  COORDINATOR_EMAIL,
  strongPassword,
  resetDb,
  newClient,
  createAccount,
  loginAsCoordinator,
  createCandidate,
  signedInCandidate,
} = require('./helpers');

beforeEach(resetDb);
afterAll(() => pool.end());

const LOGIN = '/api/v1/auth/login';
const CHANGE = '/api/v1/auth/change-password';
const GENERIC_ERROR = 'Invalid email or password.';
const HOUR = 60 * 60 * 1000;

describe('login', () => {
  test('requires an email and a password', async () => {
    const res = await newClient().post(LOGIN, {});
    expect(res.status).toBe(400);
  });

  test('refuses a wrong password with a generic message', async () => {
    await createAccount(COORDINATOR_EMAIL, 'Coordinator', strongPassword());
    const res = await newClient().post(LOGIN, {
      email: COORDINATOR_EMAIL,
      password: 'not-the-password',
    });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe(GENERIC_ERROR);
  });

  test('gives the same answer for an email that does not exist', async () => {
    const res = await newClient().post(LOGIN, {
      email: 'nobody@example.com',
      password: 'not-the-password',
    });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe(GENERIC_ERROR);
  });

  test('ignores letter case in the email', async () => {
    const password = strongPassword();
    await createAccount(COORDINATOR_EMAIL, 'Coordinator', password);
    const res = await newClient().post(LOGIN, {
      email: COORDINATOR_EMAIL.toUpperCase(),
      password,
    });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ role: 'Coordinator', mustChangePassword: false });
  });

  test('sets an HttpOnly session cookie and never returns a password hash', async () => {
    const password = strongPassword();
    await createAccount(COORDINATOR_EMAIL, 'Coordinator', password);
    const res = await newClient().post(LOGIN, { email: COORDINATOR_EMAIL, password });
    const cookie = res.headers['set-cookie'].find((value) => value.startsWith('lpt.sid='));
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    expect(JSON.stringify(res.body)).not.toContain('$2b$');
  });

  test('refuses a login that has no CSRF token', async () => {
    const password = strongPassword();
    await createAccount(COORDINATOR_EMAIL, 'Coordinator', password);
    const res = await newClient().postWithoutCsrf(LOGIN, { email: COORDINATOR_EMAIL, password });
    expect(res.status).toBe(403);
  });

  test('refuses an expired temporary password', async () => {
    const password = strongPassword();
    await createAccount('expired@example.com', 'Candidate', password, {
      mustChange: true,
      expiresAt: new Date(Date.now() - HOUR),
    });
    const res = await newClient().post(LOGIN, { email: 'expired@example.com', password });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe(GENERIC_ERROR);
  });

  test('accepts a temporary password that has not expired yet', async () => {
    const password = strongPassword();
    await createAccount('fresh@example.com', 'Candidate', password, {
      mustChange: true,
      expiresAt: new Date(Date.now() + HOUR),
    });
    const res = await newClient().post(LOGIN, { email: 'fresh@example.com', password });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ role: 'Candidate', mustChangePassword: true });
  });
});

describe('first login', () => {
  // A candidate who signed in with the temporary password but has not changed it yet
  async function candidateWithTemporaryPassword() {
    const coordinator = await loginAsCoordinator();
    const candidate = await createCandidate(coordinator);
    const client = newClient();
    const res = await client.post(LOGIN, {
      email: candidate.email,
      password: candidate.temporaryPassword,
    });
    expect(res.status).toBe(200);
    expect(res.body.mustChangePassword).toBe(true);
    return { client, candidate };
  }

  test('locks the candidate out of everything except password change and logout', async () => {
    const { client } = await candidateWithTemporaryPassword();
    const training = await client.get('/api/v1/me/assignments');
    expect(training.status).toBe(403);
    expect(training.body.message).toMatch(/change your temporary password/i);
    expect((await client.get('/api/v1/activities')).status).toBe(403);
    expect((await client.get('/api/v1/auth/me')).status).toBe(200);
  });

  test('unlocks My Training after the password is changed', async () => {
    const { client, candidate } = await candidateWithTemporaryPassword();
    const changed = await client.post(CHANGE, {
      currentPassword: candidate.temporaryPassword,
      newPassword: strongPassword(),
    });
    expect(changed.status).toBe(204);
    const training = await client.get('/api/v1/me/assignments');
    expect(training.status).toBe(200);
    expect(training.body).toEqual([]);
  });

  test('rejects a wrong current password', async () => {
    const { client } = await candidateWithTemporaryPassword();
    const res = await client.post(CHANGE, {
      currentPassword: 'not-the-password',
      newPassword: strongPassword(),
    });
    expect(res.status).toBe(401);
  });

  test('rejects a new password that is too short', async () => {
    const { client, candidate } = await candidateWithTemporaryPassword();
    const res = await client.post(CHANGE, {
      currentPassword: candidate.temporaryPassword,
      newPassword: 'short',
    });
    expect(res.status).toBe(400);
  });

  test('rejects a new password that matches the current one', async () => {
    const { client, candidate } = await candidateWithTemporaryPassword();
    const res = await client.post(CHANGE, {
      currentPassword: candidate.temporaryPassword,
      newPassword: candidate.temporaryPassword,
    });
    expect(res.status).toBe(400);
  });

  test('stops the old temporary password from working after the change', async () => {
    const { client, candidate } = await candidateWithTemporaryPassword();
    await client.post(CHANGE, {
      currentPassword: candidate.temporaryPassword,
      newPassword: strongPassword(),
    });
    const res = await newClient().post(LOGIN, {
      email: candidate.email,
      password: candidate.temporaryPassword,
    });
    expect(res.status).toBe(401);
  });

  test('refuses the change when the temporary password has expired', async () => {
    const { client, candidate } = await candidateWithTemporaryPassword();
    await pool.query(
      `UPDATE accounts SET temp_password_expires_at = NOW() - INTERVAL '1 hour'
       WHERE LOWER(email) = LOWER($1)`,
      [candidate.email]
    );
    const res = await client.post(CHANGE, {
      currentPassword: candidate.temporaryPassword,
      newPassword: strongPassword(),
    });
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/expired/i);
  });

  test('signs the same account out everywhere else after a password change', async () => {
    const coordinator = await loginAsCoordinator();
    const candidate = await createCandidate(coordinator);
    const credentials = { email: candidate.email, password: candidate.temporaryPassword };
    const first = newClient();
    const second = newClient();
    await first.post(LOGIN, credentials);
    await second.post(LOGIN, credentials);

    await first.post(CHANGE, {
      currentPassword: candidate.temporaryPassword,
      newPassword: strongPassword(),
    });

    expect((await second.get('/api/v1/auth/me')).status).toBe(401);
    expect((await first.get('/api/v1/auth/me')).status).toBe(200);
  });
});

describe('logout and session expiry', () => {
  test('logging out ends the session', async () => {
    const coordinator = await loginAsCoordinator();
    const { client } = await signedInCandidate(coordinator);
    expect((await client.post('/api/v1/auth/logout')).status).toBe(204);
    expect((await client.get('/api/v1/auth/me')).status).toBe(401);
  });

  test('logging out needs a signed in user', async () => {
    const res = await newClient().post('/api/v1/auth/logout');
    expect(res.status).toBe(401);
  });

  test('refuses a session that has expired', async () => {
    const coordinator = await loginAsCoordinator();
    expect((await coordinator.get('/api/v1/auth/me')).status).toBe(200);
    await pool.query(`UPDATE session SET expire = NOW() - INTERVAL '1 hour'`);
    expect((await coordinator.get('/api/v1/auth/me')).status).toBe(401);
  });

  test('refuses signed out visitors on protected routes', async () => {
    const visitor = newClient();
    expect((await visitor.get('/api/v1/activities')).status).toBe(401);
    expect((await visitor.get('/api/v1/learners')).status).toBe(401);
    expect((await visitor.get('/api/v1/me/assignments')).status).toBe(401);
    expect((await visitor.get('/api/v1/cohort-summary')).status).toBe(401);
  });
});