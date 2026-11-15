const express = require('express');
const helmet = require('helmet');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const pool = require('./db');

if (!process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET is missing in .env');
}

const app = express();

app.use(helmet());
app.use(express.json());

app.use(
  session({
    store: new pgSession({ pool, tableName: 'session' }),
    name: 'lpt.sid',
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 2 * 60 * 60 * 1000,
    },
  })
);

app.get('/api/v1/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

module.exports = app;