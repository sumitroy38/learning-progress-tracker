/* Development reset: removes old tables so this file can be run again.
   Warning: this deletes all data in these tables. */

DROP TABLE IF EXISTS "session";

DROP TABLE IF EXISTS assignments;
DROP TABLE IF EXISTS learners;
DROP TABLE IF EXISTS activities;
DROP TABLE IF EXISTS accounts;

/* Login accounts for coordinators and candidates */
CREATE TABLE accounts (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('Coordinator', 'Candidate')),
  must_change_password BOOLEAN NOT NULL DEFAULT TRUE,
  temp_password_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

/* Email must be unique no matter the letter case */
CREATE UNIQUE INDEX accounts_email_unique ON accounts (LOWER(email));

/* One learner profile per candidate account */
CREATE TABLE learners (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  display_name TEXT NOT NULL CHECK (LENGTH(TRIM(display_name)) > 0),
  cohort TEXT NOT NULL CHECK (LENGTH(TRIM(cohort)) > 0),
  account_id INTEGER NOT NULL UNIQUE REFERENCES accounts (id) ON DELETE CASCADE
);

/* Learning activities that can be assigned */
CREATE TABLE activities (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title TEXT NOT NULL CHECK (LENGTH(TRIM(title)) > 0),
  topic TEXT NOT NULL CHECK (LENGTH(TRIM(topic)) > 0),
  planned_hours NUMERIC(5, 2) NOT NULL CHECK (planned_hours > 0)
);

/* An activity given to a learner, with its progress status */
CREATE TABLE assignments (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  learner_id INTEGER NOT NULL REFERENCES learners (id) ON DELETE CASCADE,
  activity_id INTEGER NOT NULL REFERENCES activities (id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'Not Started'
    CHECK (status IN ('Not Started', 'In Progress', 'Completed')),
  UNIQUE (learner_id, activity_id)
);

/* Login sessions, used by connect-pg-simple */
CREATE TABLE "session" (
  "sid" VARCHAR NOT NULL PRIMARY KEY,
  "sess" JSON NOT NULL,
  "expire" TIMESTAMP(6) NOT NULL
);
CREATE INDEX "IDX_session_expire" ON "session" ("expire");

