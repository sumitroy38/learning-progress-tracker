// Creates all tables from db/schema.sql.
//
//   npm run db:init        sets up the main database (DATABASE_URL)
//   npm run db:init:test   sets up the test database (TEST_DATABASE_URL)
//
// WARNING: schema.sql removes the old tables first, so all data in them is deleted.
// For that reason this script asks you to type the database name before it does anything.
require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const { openPrompt } = require('./prompt');

async function main() {
  const useTest = process.argv.includes('test');
  const variable = useTest ? 'TEST_DATABASE_URL' : 'DATABASE_URL';
  const url = process.env[variable];
  if (!url) {
    console.error(`${variable} is missing. Copy server/.env.example to server/.env and fill it in.`);
    process.exitCode = 1;
    return;
  }

  const databaseName = decodeURIComponent(new URL(url).pathname.replace('/', ''));
  console.log(`This will DELETE and recreate every table in the database "${databaseName}".`);

  const prompt = openPrompt();
  const answer = (await prompt.ask(`Type the database name (${databaseName}) to continue: `)).trim();
  prompt.close();
  if (answer !== databaseName) {
    console.log('Names did not match. Nothing was changed.');
    process.exitCode = 1;
    return;
  }

  const pool = new Pool({ connectionString: url });
  try {
    const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await pool.query(sql);
    console.log('Done. Tables created: accounts, learners, activities, assignments, session.');
    console.log('Next: npm run coordinator:create');
  } catch (err) {
    console.error('Could not create the tables:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

// Exit on purpose: a failed database login can otherwise leave the program hanging
main().finally(() => process.exit());
