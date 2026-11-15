const express = require('express');
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit');
const pool = require('../db');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many login attempts. Please try again later.' },
});

// Used when the email does not exist, so the response takes the same time
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12);

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

module.exports = router;