require('dotenv').config({ quiet: true });
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// A hosted database may close idle connections, for example when it goes to sleep.
// Without this handler, that one event would stop the whole server.
// The pool simply opens a new connection the next time it is needed.
pool.on('error', (err) => {
  console.error('Idle database connection closed:', err.message);
});

module.exports = pool;