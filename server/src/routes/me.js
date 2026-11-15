const express = require('express');
const pool = require('../db');
const { ASSIGNMENT_SELECT, toAssignment } = require('../utils');

const router = express.Router();

// My Training: only the signed in candidate's own assignments
router.get('/assignments', async (req, res, next) => {
  try {
    const me = await pool.query('SELECT id FROM learners WHERE account_id = $1', [
      req.session.accountId,
    ]);
    if (me.rows.length === 0) {
      return res.status(404).json({ message: 'Learner not found.' });
    }

    const { rows } = await pool.query(
      `${ASSIGNMENT_SELECT} WHERE asg.learner_id = $1 ORDER BY asg.id`,
      [me.rows[0].id]
    );
    res.json(rows.map(toAssignment));
  } catch (err) {
    next(err);
  }
});

module.exports = router;