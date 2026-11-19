// Adds fictional demo data: 3 candidates and 4 activities. No real people, no real data.
//
//   npm run db:seed
//
// Each candidate gets a random temporary password, printed once in this terminal and never saved
// anywhere in readable form. The passwords stop working after 24 hours. After that, the coordinator
// can use "Reset password" in the app to make a new one.
//
// This script does not create a coordinator. Use: npm run coordinator:create
require('dotenv').config({ quiet: true });
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

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

const randomPassword = () => crypto.randomBytes(9).toString('base64url');

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is missing. Copy server/.env.example to server/.env and fill it in.');
    process.exitCode = 1;
    return;
  }

  let client;
  try {
    client = await pool.connect();
    const existing = await client.query(
      `SELECT (SELECT COUNT(*) FROM learners)::int AS learners,
              (SELECT COUNT(*) FROM activities)::int AS activities`
    );
    if (existing.rows[0].learners > 0 || existing.rows[0].activities > 0) {
      console.log('Demo data is already there, so nothing was added.');
      console.log('To start fresh, run: npm run db:init (this deletes everything), then seed again.');
      return;
    }

    // Everything is saved together, or nothing is saved
    await client.query('BEGIN');
    const credentials = [];

    for (const candidate of candidates) {
      const password = randomPassword();
      const hash = await bcrypt.hash(password, 12);
      const account = await client.query(
        `INSERT INTO accounts (email, password_hash, role, must_change_password, temp_password_expires_at)
         VALUES ($1, $2, 'Candidate', TRUE, NOW() + INTERVAL '24 hours') RETURNING id`,
        [candidate.email, hash]
      );
      await client.query(
        'INSERT INTO learners (display_name, cohort, account_id) VALUES ($1, $2, $3)',
        [candidate.name, candidate.cohort, account.rows[0].id]
      );
      credentials.push({ username: candidate.email, temporaryPassword: password });
    }

    for (const [title, topic, hours] of activities) {
      await client.query(
        'INSERT INTO activities (title, topic, planned_hours) VALUES ($1, $2, $3)',
        [title, topic, hours]
      );
    }

    await client.query('COMMIT');
    console.log('\nDemo data added: 3 candidates and 4 activities.');
    console.log('Temporary passwords are shown only now. They expire in 24 hours:\n');
    console.table(credentials);
  } catch (err) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    if (err.code === '42P01') console.error('The tables do not exist yet. Run: npm run db:init');
    else console.error('Seeding failed:', err.message);
    process.exitCode = 1;
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

// Exit on purpose: a failed database login can otherwise leave the program hanging
main().finally(() => process.exit());
