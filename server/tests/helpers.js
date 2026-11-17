const crypto = require('crypto');
const bcrypt = require('bcrypt');
const request = require('supertest');
const pool = require('../src/db');
const app = require('../src/app');

const COORDINATOR_EMAIL = 'coordinator.test@example.com';

// Random passwords made while the tests run, so no password is written in the code
const strongPassword = () => crypto.randomBytes(12).toString('base64url');

let emailCounter = 0;
const uniqueEmail = (prefix = 'candidate') => `${prefix}.${++emailCounter}@example.com`;

// Empties every table, so each test starts clean
async function resetDb() {
  await pool.query(
    'TRUNCATE assignments, learners, activities, accounts, "session" RESTART IDENTITY CASCADE'
  );
}

// A fake browser. It keeps cookies and adds the CSRF token to every changing request.
function newClient() {
  const agent = request.agent(app);

  const withCsrf = async (method, path, body) => {
    const tokenResponse = await agent.get('/api/v1/auth/csrf-token');
    return agent[method](path)
      .set('x-csrf-token', tokenResponse.body.csrfToken)
      .send(body || {});
  };

  return {
    get: (path) => agent.get(path),
    post: (path, body) => withCsrf('post', path, body),
    put: (path, body) => withCsrf('put', path, body),
    patch: (path, body) => withCsrf('patch', path, body),
    // Sends no CSRF token, to prove the server refuses it
    postWithoutCsrf: (path, body) => agent.post(path).send(body || {}),
  };
}

// Saves an account straight in the database (a low bcrypt cost keeps the tests quick)
async function createAccount(email, role, password, options = {}) {
  const { mustChange = false, expiresAt = null } = options;
  const hash = await bcrypt.hash(password, 4);
  const { rows } = await pool.query(
    `INSERT INTO accounts (email, password_hash, role, must_change_password, temp_password_expires_at)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [email, hash, role, mustChange, expiresAt]
  );
  return rows[0].id;
}

async function loginAsCoordinator() {
  const password = strongPassword();
  await createAccount(COORDINATOR_EMAIL, 'Coordinator', password);
  const client = newClient();
  const res = await client.post('/api/v1/auth/login', { email: COORDINATOR_EMAIL, password });
  expect(res.status).toBe(200);
  return client;
}

// The coordinator adds a candidate and receives the one time credentials
async function createCandidate(coordinator, name = 'Test Candidate', email = uniqueEmail()) {
  const res = await coordinator.post('/api/v1/learners', { name, email, cohort: 'Cohort Test' });
  expect(res.status).toBe(201);
  return {
    learnerId: res.body.learner.id,
    email: res.body.credentials.username,
    temporaryPassword: res.body.credentials.temporaryPassword,
  };
}

// A candidate who has signed in and already replaced the temporary password
async function signedInCandidate(coordinator, name, email) {
  const candidate = await createCandidate(coordinator, name, email);
  const client = newClient();
  let res = await client.post('/api/v1/auth/login', {
    email: candidate.email,
    password: candidate.temporaryPassword,
  });
  expect(res.status).toBe(200);
  const password = strongPassword();
  res = await client.post('/api/v1/auth/change-password', {
    currentPassword: candidate.temporaryPassword,
    newPassword: password,
  });
  expect(res.status).toBe(204);
  return { ...candidate, client, password };
}

async function createActivity(coordinator, overrides = {}) {
  const res = await coordinator.post('/api/v1/activities', {
    title: 'React Basics',
    topic: 'Frontend',
    plannedHours: 6,
    ...overrides,
  });
  expect(res.status).toBe(201);
  return res.body;
}

async function assign(coordinator, learnerId, activityId) {
  const res = await coordinator.post('/api/v1/assignments', { learnerId, activityId });
  expect(res.status).toBe(201);
  return res.body;
}

module.exports = {
  pool,
  COORDINATOR_EMAIL,
  strongPassword,
  uniqueEmail,
  resetDb,
  newClient,
  createAccount,
  loginAsCoordinator,
  createCandidate,
  signedInCandidate,
  createActivity,
  assign,
};