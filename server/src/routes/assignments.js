const express = require('express');
const pool = require('../db');
const { requireRole } = require('../middleware/auth');
const { ASSIGNMENT_SELECT, toAssignment } = require('../utils');

const router = express.Router();

// A valid id is a whole number that fits in the database
const isId = (value) => Number.isInteger(value) && value >= 1 && value <= 2147483647;

// Assign an activity to a learner (coordinator only)
router.post('/', requireRole('Coordinator'), async (req, res, next) => {
  try {
    const { learnerId, activityId } = req.body || {};
    if (!isId(learnerId) || !isId(activityId)) {
      return res.status(400).json({ message: 'Learner and activity are required.' });
    }

    const learner = await pool.query('SELECT id FROM learners WHERE id = $1', [learnerId]);
    if (learner.rows.length === 0) {
      return res.status(404).json({ message: 'Learner not found.' });
    }
    const activity = await pool.query('SELECT id FROM activities WHERE id = $1', [activityId]);
    if (activity.rows.length === 0) {
      return res.status(404).json({ message: 'Activity not found.' });
    }

    const inserted = await pool.query(
      'INSERT INTO assignments (learner_id, activity_id) VALUES ($1, $2) RETURNING id',
      [learnerId, activityId]
    );
    const { rows } = await pool.query(`${ASSIGNMENT_SELECT} WHERE asg.id = $1`, [
      inserted.rows[0].id,
    ]);
    res.status(201).json(toAssignment(rows[0]));
  } catch (err) {
    // The database refuses a second assignment of the same activity to the same learner
    if (err.code === '23505') {
      return res.status(409).json({ message: 'Assignment already exists.' });
    }
    next(err);
  }
});

module.exports = router;