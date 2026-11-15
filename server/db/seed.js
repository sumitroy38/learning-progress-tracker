require('dotenv').config();
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Random one time password, shown only in this terminal, never saved in code
const randomPassword = () => crypto.randomBytes(9).toString('base64url');

const COORDINATOR_EMAIL = process.env.COORDINATOR_EMAIL || 'coordinator@example.com';

const candidates = [
  { name: 'Asha Verma', email: 'asha.verma@example.com', cohort: 'Cohort A' },
  { name: 'Ravi Menon', email: 'ravi.menon@example.com', cohort: 'Cohort A' },
  { name: 'Meera Iyer', email: 'meera.iyer@example.com', cohort: 'Cohort B' },
];

const activities = [
  ['React Basics', 'Frontend', 6],
  ['Node and Express', 'Backend', 8],
  ['SQL Fundamentals', 'Database', 5],
  ['Git and GitHub', 'Tools', 3],
];

async function addAccount(client, email, role) {
  const password = randomPassword();
  const hash = await bcrypt.hash(password, 12);
  const { rows } = await client.query(
    `INSERT INTO accounts (email, password_hash, role, must_change_password, temp_password_expires_at)
     VALUES ($1, $2, $3, TRUE, NOW() + INTERVAL '24 hours') RETURNING id`,
    [email.toLowerCase(), hash, role]
  );
  return { id: rows[0].id, password };
}

async function main() {
  const client = await pool.connect();
  try {
    const existing = await client.query('SELECT COUNT(*)::int AS n FROM accounts');
    if (existing.rows[0].n > 0) {
      console.log('Accounts already exist. Re-run schema.sql first to start fresh.');
      return;
    }

    await client.query('BEGIN');
    const credentials = [];

    const coord = await addAccount(client, COORDINATOR_EMAIL, 'Coordinator');
    credentials.push({ role: 'Coordinator', email: COORDINATOR_EMAIL, password: coord.password });

    for (const c of candidates) {
      const acc = await addAccount(client, c.email, 'Candidate');
      await client.query(
        'INSERT INTO learners (display_name, cohort, account_id) VALUES ($1, $2, $3)',
        [c.name, c.cohort, acc.id]
      );
      credentials.push({ role: 'Candidate', email: c.email, password: acc.password });
    }

    for (const [title, topic, hours] of activities) {
      await client.query(
        'INSERT INTO activities (title, topic, planned_hours) VALUES ($1, $2, $3)',
        [title, topic, hours]
      );
    }

    await client.query('COMMIT');
    console.log('\nSeed complete. Save these now, they are shown only once:\n');
    console.table(credentials);
    console.log('Temporary passwords expire in 24 hours.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();