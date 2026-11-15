const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('../db');
const { parseId, generateTempPassword, ASSIGNMENT_SELECT, toAssignment } = require('../utils');

const router = express.Router();

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Checks the sent data. Returns an error message, or null if all is fine.
function validateCandidate(body) {
  const { name, email, cohort } = body || {};
  if (typeof name !== 'string' || !name.trim()) return 'Name is required.';
  if (typeof email !== 'string' || !email.trim()) return 'Email is required.';
  if (typeof cohort !== 'string' || !cohort.trim()) return 'Cohort is required.';
  if (name.trim().length > 100) return 'Name must be 100 characters or fewer.';
  if (cohort.trim().length > 60) return 'Cohort must be 60 characters or fewer.';
  if (email.trim().length > 254 || !EMAIL_PATTERN.test(email.trim())) {
    return 'Please enter a valid email address.';
  }
  return null;
}

// List all learners
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT l.id, l.display_name, l.cohort, a.email
       FROM learners l JOIN accounts a ON a.id = l.account_id
       ORDER BY l.id`
    );
    res.json(
      rows.map((r) => ({ id: r.id, name: r.display_name, email: r.email, cohort: r.cohort }))
    );
  } catch (err) {
    next(err);
  }
});

// Create a candidate, with one time credentials in the answer
router.post('/', async (req, res, next) => {
  let client;
  try {
    const error = validateCandidate(req.body);
    if (error) return res.status(400).json({ message: error });

    const name = req.body.name.trim();
    const email = req.body.email.trim().toLowerCase();
    const cohort = req.body.cohort.trim();

    const temporaryPassword = generateTempPassword();
    const hash = await bcrypt.hash(temporaryPassword, 12);

    // Both rows are saved together, or neither is saved
    client = await pool.connect();
    await client.query('BEGIN');
    const account = await client.query(
      `INSERT INTO accounts (email, password_hash, role, must_change_password, temp_password_expires_at)
       VALUES ($1, $2, 'Candidate', TRUE, NOW() + INTERVAL '24 hours')
       RETURNING id, temp_password_expires_at`,
      [email, hash]
    );
    const learner = await client.query(
      `INSERT INTO learners (display_name, cohort, account_id)
       VALUES ($1, $2, $3) RETURNING id`,
      [name, cohort, account.rows[0].id]
    );
    await client.query('COMMIT');

    res.status(201).json({
      learner: { id: learner.rows[0].id, name, email, cohort },
      credentials: {
        username: email,
        temporaryPassword,
        expiresAt: account.rows[0].temp_password_expires_at,
      },
    });
  } catch (err) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    if (err.code === '23505') {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }
    next(err);
  } finally {
    if (client) client.release();
  }
});

// Reset a candidate's password
router.post('/:id/reset-password', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) return res.status(404).json({ message: 'Learner not found.' });

    const found = await pool.query(
      `SELECT a.id AS account_id, a.email
       FROM learners l JOIN accounts a ON a.id = l.account_id
       WHERE l.id = $1`,
      [id]
    );
    if (found.rows.length === 0) return res.status(404).json({ message: 'Learner not found.' });
    const { account_id: accountId, email } = found.rows[0];

    const temporaryPassword = generateTempPassword();
    const hash = await bcrypt.hash(temporaryPassword, 12);

    const updated = await pool.query(
      `UPDATE accounts
       SET password_hash = $1, must_change_password = TRUE,
           temp_password_expires_at = NOW() + INTERVAL '24 hours'
       WHERE id = $2
       RETURNING temp_password_expires_at`,
      [hash, accountId]
    );

    // Sign the candidate out everywhere
    await pool.query(`DELETE FROM session WHERE (sess->>'accountId')::int = $1`, [accountId]);

    res.status(200).json({
      credentials: {
        username: email,
        temporaryPassword,
        expiresAt: updated.rows[0].temp_password_expires_at,
      },
    });
  } catch (err) {
    next(err);
  }
});

// View one learner's assignments with activity details
router.get('/:id/assignments', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) return res.status(404).json({ message: 'Learner not found.' });

    const learner = await pool.query('SELECT id FROM learners WHERE id = $1', [id]);
    if (learner.rows.length === 0) {
      return res.status(404).json({ message: 'Learner not found.' });
    }

    const { rows } = await pool.query(
      `${ASSIGNMENT_SELECT} WHERE asg.learner_id = $1 ORDER BY asg.id`,
      [id]
    );
    res.json(rows.map(toAssignment));
  } catch (err) {
    next(err);
  }
});

module.exports = router;