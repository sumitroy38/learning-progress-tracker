const express = require('express');
const pool = require('../db');

const router = express.Router();

// Cohort totals, counted from the saved data every time
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM learners) AS learners,
        (SELECT COUNT(*) FROM assignments) AS assignments,
        (SELECT COUNT(*) FROM assignments WHERE status = 'Completed') AS completed`);
    res.json({
      learners: Number(rows[0].learners),
      assignments: Number(rows[0].assignments),
      completed: Number(rows[0].completed),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;