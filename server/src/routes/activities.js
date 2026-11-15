const express = require('express');
const pool = require('../db');
const { parseId } = require('../utils');

const router = express.Router();

// Shapes a database row into what the app receives
const toActivity = (row) => ({
  id: row.id,
  title: row.title,
  topic: row.topic,
  plannedHours: Number(row.planned_hours),
});

// Checks the sent data. Returns an error message, or null if all is fine.
function validateActivity(body) {
  const { title, topic, plannedHours } = body || {};
  if (typeof title !== 'string' || !title.trim()) return 'Title is required.';
  if (typeof topic !== 'string' || !topic.trim()) return 'Topic is required.';
  if (title.trim().length > 120) return 'Title must be 120 characters or fewer.';
  if (topic.trim().length > 60) return 'Topic must be 60 characters or fewer.';
  if (plannedHours === undefined || plannedHours === null || plannedHours === '') {
    return 'Planned hours is required.';
  }
  if (typeof plannedHours !== 'number' || !Number.isFinite(plannedHours)) {
    return 'Planned hours must be a number.';
  }
  if (plannedHours <= 0) return 'Planned hours must be greater than zero.';
  if (plannedHours < 0.01) return 'Planned hours must be at least 0.01.';
  if (plannedHours > 999) return 'Planned hours must be 999 or less.';
  return null;
}

// List all activities
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, title, topic, planned_hours FROM activities ORDER BY id'
    );
    res.json(rows.map(toActivity));
  } catch (err) {
    next(err);
  }
});

// Create an activity
router.post('/', async (req, res, next) => {
  try {
    const error = validateActivity(req.body);
    if (error) return res.status(400).json({ message: error });

    const { title, topic, plannedHours } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO activities (title, topic, planned_hours)
       VALUES ($1, $2, $3)
       RETURNING id, title, topic, planned_hours`,
      [title.trim(), topic.trim(), plannedHours]
    );
    res.status(201).json(toActivity(rows[0]));
  } catch (err) {
    next(err);
  }
});

// Edit an activity
router.put('/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) return res.status(404).json({ message: 'Activity not found.' });

    const error = validateActivity(req.body);
    if (error) return res.status(400).json({ message: error });

    const { title, topic, plannedHours } = req.body;
    const { rows } = await pool.query(
      `UPDATE activities SET title = $1, topic = $2, planned_hours = $3
       WHERE id = $4
       RETURNING id, title, topic, planned_hours`,
      [title.trim(), topic.trim(), plannedHours, id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Activity not found.' });
    res.json(toActivity(rows[0]));
  } catch (err) {
    next(err);
  }
});

module.exports = router;