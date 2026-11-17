const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const pool = require('./db');
const { doubleCsrfProtection, invalidCsrfTokenError } = require('./csrf');
const { requireAuth, requireRole, firstLoginGate } = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const activityRoutes = require('./routes/activities');
const learnerRoutes = require('./routes/learners');

const assignmentRoutes = require('./routes/assignments');
const summaryRoutes = require('./routes/summary');
const meRoutes = require('./routes/me');

if (!process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET is missing in .env');
}

const app = express();

app.use(helmet());
app.use(express.json());
app.use(cookieParser());

app.use(
  session({
        store: new pgSession({
      pool,
      tableName: 'session',
      // The cleanup timer is switched off while testing
      pruneSessionInterval: process.env.NODE_ENV === 'test' ? false : 60,
    }),
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

// API answers are never stored by the browser (important for one time passwords)
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

app.use(doubleCsrfProtection);
app.use('/api/v1', firstLoginGate);

app.get('/api/v1/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});
app.use('/api/v1/auth', authRoutes);

app.use('/api/v1/activities', requireAuth, requireRole('Coordinator'), activityRoutes);
app.use('/api/v1/learners', requireAuth, requireRole('Coordinator'), learnerRoutes);

app.use('/api/v1/assignments', requireAuth, assignmentRoutes);
app.use('/api/v1/cohort-summary', requireAuth, requireRole('Coordinator'), summaryRoutes);

app.use('/api/v1/me', requireAuth, requireRole('Candidate'), meRoutes);

app.use('/api', (req, res) => {
  res.status(404).json({ message: 'Not found.' });
});

app.use((err, req, res, next) => {
  if (err === invalidCsrfTokenError || err.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({ message: 'Invalid or missing CSRF token.' });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Request body is not valid JSON.' });
  }
  console.error('Unexpected error:', err.message);
  res.status(500).json({ message: 'Something went wrong.' });
});

module.exports = app; 