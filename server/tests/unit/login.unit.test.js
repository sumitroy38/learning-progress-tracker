jest.mock('../../src/db', () => ({ query: jest.fn() }));
jest.mock('bcrypt', () => ({
  hashSync: jest.fn(() => 'dummy-hash'),
  hash: jest.fn(),
  compare: jest.fn(),
}));

const express = require('express');
const request = require('supertest');
const bcrypt = require('bcrypt');
const pool = require('../../src/db');
const authRoutes = require('../../src/routes/auth');

const GENERIC_ERROR = 'Invalid email or password.';
const HOUR = 60 * 60 * 1000;

let lastSession;

// A tiny app with a fake session, so no real session store is needed
function buildApp() {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    const session = {
      regenerate(callback) {
        Object.keys(session).forEach((key) => {
          if (typeof session[key] !== 'function') delete session[key];
        });
        callback();
      },
      save(callback) {
        callback();
      },
    };
    lastSession = session;
    req.session = session;
    next();
  });
  app.use('/auth', authRoutes);
  return app;
}

const accountRow = (overrides = {}) => ({
  id: 7,
  password_hash: 'stored-hash',
  role: 'Candidate',
  must_change_password: false,
  temp_password_expires_at: null,
  ...overrides,
});

const login = (body) => request(buildApp()).post('/auth/login').send(body);

beforeEach(() => {
  jest.resetAllMocks();
});

describe('login with fake database and fake bcrypt', () => {
  test('signs in when the password matches', async () => {
    pool.query.mockResolvedValueOnce({ rows: [accountRow()] });
    bcrypt.compare.mockResolvedValueOnce(true);

    const res = await login({ email: ' Asha@Example.com ', password: 'any-password' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ role: 'Candidate', mustChangePassword: false });
    expect(lastSession.accountId).toBe(7);
    expect(lastSession.role).toBe('Candidate');
    expect(pool.query.mock.calls[0][1]).toEqual(['Asha@Example.com']);
    expect(bcrypt.compare).toHaveBeenCalledWith('any-password', 'stored-hash');
  });

  test('refuses a wrong password with the generic message', async () => {
    pool.query.mockResolvedValueOnce({ rows: [accountRow()] });
    bcrypt.compare.mockResolvedValueOnce(false);

    const res = await login({ email: 'asha@example.com', password: 'wrong' });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe(GENERIC_ERROR);
    expect(lastSession.accountId).toBeUndefined();
  });

  test('gives the same answer and still compares when the email is unknown', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    bcrypt.compare.mockResolvedValueOnce(false);

    const res = await login({ email: 'nobody@example.com', password: 'some-password' });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe(GENERIC_ERROR);
    expect(bcrypt.compare).toHaveBeenCalledWith('some-password', 'dummy-hash');
  });

  test('refuses an expired temporary password even when it matches', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        accountRow({
          must_change_password: true,
          temp_password_expires_at: new Date(Date.now() - HOUR),
        }),
      ],
    });
    bcrypt.compare.mockResolvedValueOnce(true);

    const res = await login({ email: 'asha@example.com', password: 'temp-password' });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe(GENERIC_ERROR);
    expect(lastSession.accountId).toBeUndefined();
  });

  test('accepts a temporary password that is still valid and asks for a change', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        accountRow({
          must_change_password: true,
          temp_password_expires_at: new Date(Date.now() + HOUR),
        }),
      ],
    });
    bcrypt.compare.mockResolvedValueOnce(true);

    const res = await login({ email: 'asha@example.com', password: 'temp-password' });

    expect(res.status).toBe(200);
    expect(res.body.mustChangePassword).toBe(true);
    expect(lastSession.mustChangePassword).toBe(true);
  });

  test('answers 400 and skips the database when fields are missing', async () => {
    const res = await login({ email: 'asha@example.com' });

    expect(res.status).toBe(400);
    expect(pool.query).not.toHaveBeenCalled();
  });

  test('answers 400 when the email is not text', async () => {
    const res = await login({ email: { $ne: null }, password: 'any-password' });

    expect(res.status).toBe(400);
    expect(pool.query).not.toHaveBeenCalled();
  });

  test('answers 500 when the database fails', async () => {
    pool.query.mockRejectedValueOnce(new Error('database is down'));

    const res = await login({ email: 'asha@example.com', password: 'any-password' });

    expect(res.status).toBe(500);
  });
});