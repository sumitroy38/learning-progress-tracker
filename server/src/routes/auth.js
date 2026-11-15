const express = require('express');
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit');
const pool = require('../db');
const { generateCsrfToken } = require('../csrf');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const limiter = (message) =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { message },
  });

const loginLimiter = limiter('Too many login attempts. Please try again later.');
const changePasswordLimiter = limiter('Too many attempts. Please try again later.');

// Used when the email does not exist, so the response takes the same time
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12);

// Gives the app a fresh CSRF token. Needed before every login and every change.
router.get('/csrf-token', (req, res) => {
  req.session.csrfReady = true; // makes the server keep this session
  const csrfToken = generateCsrfToken(req, res, { overwrite: true });
  res.json({ csrfToken });
});

router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const { rows } = await pool.query(
      `SELECT id, password_hash, role, must_change_password, temp_password_expires_at
       FROM accounts WHERE LOWER(email) = LOWER($1)`,
      [email.trim()]
    );
    const account = rows[0];

    const passwordOk = await bcrypt.compare(
      password,
      account ? account.password_hash : DUMMY_HASH
    );
    const tempExpired =
      account &&
      account.must_change_password &&
      account.temp_password_expires_at &&
      new Date(account.temp_password_expires_at) < new Date();

    if (!account || !passwordOk || tempExpired) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    req.session.regenerate((err) => {
      if (err) return next(err);
      req.session.accountId = account.id;
      req.session.role = account.role;
      req.session.mustChangePassword = account.must_change_password;
      req.session.save((saveErr) => {
        if (saveErr) return next(saveErr);
        res.status(200).json({
          role: account.role,
          mustChangePassword: account.must_change_password,
        });
      });
    });
  } catch (err) {
    next(err);
  }
});

// Tells the app who is signed in, for example after a page refresh
router.get('/me', requireAuth, (req, res) => {
  res.json({ role: req.session.role, mustChangePassword: req.session.mustChangePassword });
});

router.post('/change-password', requireAuth, changePasswordLimiter, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (
      typeof currentPassword !== 'string' ||
      typeof newPassword !== 'string' ||
      !currentPassword ||
      !newPassword
    ) {
      return res.status(400).json({ message: 'Current password and new password are required.' });
    }
    if (newPassword.length < 10) {
      return res.status(400).json({ message: 'New password must be at least 10 characters.' });
    }
    if (Buffer.byteLength(newPassword) > 72) {
      return res.status(400).json({ message: 'New password is too long.' });
    }
    if (newPassword === currentPassword) {
      return res.status(400).json({ message: 'New password must be different.' });
    }

    const accountId = req.session.accountId;
    const role = req.session.role;

    const { rows } = await pool.query(
      `SELECT password_hash, must_change_password, temp_password_expires_at
       FROM accounts WHERE id = $1`,
      [accountId]
    );
    const account = rows[0];
    if (!account) {
      return res.status(401).json({ message: 'Please sign in again.' });
    }

    const passwordOk = await bcrypt.compare(currentPassword, account.password_hash);
    if (!passwordOk) {
      return res.status(401).json({ message: 'Current password is incorrect.' });
    }
    if (
      account.must_change_password &&
      account.temp_password_expires_at &&
      new Date(account.temp_password_expires_at) < new Date()
    ) {
      return res
        .status(401)
        .json({ message: 'Your temporary password has expired. Ask your coordinator for a new one.' });
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await pool.query(
      `UPDATE accounts
       SET password_hash = $1, must_change_password = FALSE, temp_password_expires_at = NULL
       WHERE id = $2`,
      [newHash, accountId]
    );

    // New session id after the change, then remove every other session of this account
    req.session.regenerate((err) => {
      if (err) return next(err);
      req.session.accountId = accountId;
      req.session.role = role;
      req.session.mustChangePassword = false;
      req.session.save(async (saveErr) => {
        if (saveErr) return next(saveErr);
        try {
          await pool.query(
            `DELETE FROM session WHERE (sess->>'accountId')::int = $1 AND sid <> $2`,
            [accountId, req.sessionID]
          );
          res.status(204).end();
        } catch (deleteErr) {
          next(deleteErr);
        }
      });
    });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', requireAuth, (req, res, next) => {
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie('lpt.sid');
    res.clearCookie('lpt.csrf');
    res.status(204).end();
  });
});

module.exports = router;