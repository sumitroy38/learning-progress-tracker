const crypto = require('crypto');

// Turns a URL id like "5" into the number 5. Returns null if it is not a valid id.
function parseId(value) {
  if (!/^\d+$/.test(value)) return null;
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1 || id > 2147483647) return null;
  return id;
}

// Makes a random 12 character temporary password
function generateTempPassword() {
  return crypto.randomBytes(9).toString('base64url');
}

// The database question that reads assignments together with their activity details
const ASSIGNMENT_SELECT = `
  SELECT asg.id, asg.learner_id, asg.status, asg.activity_id,
         act.title, act.topic, act.planned_hours
  FROM assignments asg
  JOIN activities act ON act.id = asg.activity_id`;

// Shapes one row from that question into what the app receives
function toAssignment(row) {
  return {
    id: row.id,
    learnerId: row.learner_id,
    status: row.status,
    activity: {
      id: row.activity_id,
      title: row.title,
      topic: row.topic,
      plannedHours: Number(row.planned_hours),
    },
  };
}

module.exports = { parseId, generateTempPassword, ASSIGNMENT_SELECT, toAssignment };