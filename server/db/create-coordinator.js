// Creates a coordinator account. This is the only way to make one: the app has no public
// registration page, and no coordinator password is written anywhere in the code.
//
//   npm run coordinator:create
//
// The script asks for an email and a password. The password is typed hidden, is never printed
// or logged, and is saved only as a salted bcrypt hash.
//
// For automated setups only, the answers can come from COORDINATOR_EMAIL and
// COORDINATOR_PASSWORD environment variables instead.
require('dotenv').config({ quiet: true });
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const { openPrompt } = require('./prompt');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Returns a message when the password is not acceptable, or null when it is fine
function passwordProblem(password, email) {
  if (password.length < 10) return 'The password must be at least 10 characters long.';
  if (Buffer.byteLength(password) > 72) return 'The password is too long (72 bytes is the most).';
  if (password.toLowerCase() === email.toLowerCase()) return 'The password must not be your email.';
  return null;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is missing. Copy server/.env.example to server/.env and fill it in.');
    process.exitCode = 1;
    return;
  }

  let email = process.env.COORDINATOR_EMAIL;
  let password = process.env.COORDINATOR_PASSWORD;

  if (!email || !password) {
    const prompt = openPrompt();
    console.log('Create a coordinator account.');
    email = (await prompt.ask('Coordinator email: ')).trim();
    if (!EMAIL_PATTERN.test(email) || email.length > 254) {
      prompt.close();
      console.error('That does not look like a valid email address.');
      process.exitCode = 1;
      return;
    }
    password = await prompt.ask('Password (at least 10 characters, hidden): ', { hidden: true });
    const again = await prompt.ask('Type the password again: ', { hidden: true });
    prompt.close();
    if (password !== again) {
      console.error('The two passwords do not match. Nothing was saved.');
      process.exitCode = 1;
      return;
    }
  } else {
    email = email.trim();
    if (!EMAIL_PATTERN.test(email) || email.length > 254) {
      console.error('COORDINATOR_EMAIL is not a valid email address.');
      process.exitCode = 1;
      return;
    }
  }

  const problem = passwordProblem(password, email);
  if (problem) {
    console.error(problem);
    process.exitCode = 1;
    return;
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const hash = await bcrypt.hash(password, 12);
    // The person choosing their own password does not need a temporary one,
    // so no password change and no expiry are required at first sign in.
    await pool.query(
      `INSERT INTO accounts (email, password_hash, role, must_change_password, temp_password_expires_at)
       VALUES ($1, $2, 'Coordinator', FALSE, NULL)`,
      [email.toLowerCase(), hash]
    );
    console.log(`Coordinator account created for ${email.toLowerCase()}.`);
  } catch (err) {
    if (err.code === '23505') {
      console.error('An account with this email already exists. Nothing was changed.');
    } else if (err.code === '42P01') {
      console.error('The tables do not exist yet. Run: npm run db:init');
    } else {
      console.error('Could not create the account:', err.message);
    }
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

// Exit on purpose: a failed database login can otherwise leave the program hanging
main().finally(() => process.exit());
