const {
  pool,
  resetDb,
  newClient,
  loginAsCoordinator,
  signedInCandidate,
  createCandidate,
  createActivity,
  assign,
} = require('./helpers');

beforeEach(resetDb);
afterAll(() => pool.end());

const LOGIN = '/api/v1/auth/login';

// A coordinator, two activities and one candidate who has not signed in yet
async function basics() {
  const coordinator = await loginAsCoordinator();
  const react = await createActivity(coordinator, { title: 'React Basics', plannedHours: 6 });
  const sql = await createActivity(coordinator, {
    title: 'SQL Fundamentals',
    topic: 'Database',
    plannedHours: 5,
  });
  const learner = await createCandidate(coordinator, 'Asha Verma');
  return { coordinator, react, sql, learner };
}

// The same, but with two candidates who are signed in and ready
async function withCandidates() {
  const coordinator = await loginAsCoordinator();
  const react = await createActivity(coordinator, { title: 'React Basics', plannedHours: 6 });
  const sql = await createActivity(coordinator, {
    title: 'SQL Fundamentals',
    topic: 'Database',
    plannedHours: 5,
  });
  const alice = await signedInCandidate(coordinator, 'Alice Test');
  const bob = await signedInCandidate(coordinator, 'Bob Test');
  return { coordinator, react, sql, alice, bob };
}

const statusUrl = (assignmentId) => `/api/v1/assignments/${assignmentId}/status`;

describe('assigning training (coordinator)', () => {
  test('assigns an activity to a learner', async () => {
    const { coordinator, react, learner } = await basics();
    const res = await coordinator.post('/api/v1/assignments', {
      learnerId: learner.learnerId,
      activityId: react.id,
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      learnerId: learner.learnerId,
      status: 'Not Started',
      activity: { id: react.id, title: 'React Basics', plannedHours: 6 },
    });
  });

  test('blocks a duplicate assignment', async () => {
    const { coordinator, react, learner } = await basics();
    await assign(coordinator, learner.learnerId, react.id);
    const res = await coordinator.post('/api/v1/assignments', {
      learnerId: learner.learnerId,
      activityId: react.id,
    });
    expect(res.status).toBe(409);
    expect(res.body.message).toBe('Assignment already exists.');

    const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM assignments');
    expect(rows[0].n).toBe(1);
  });

  test('allows several activities for one learner and one activity for several learners', async () => {
    const { coordinator, react, sql, learner } = await basics();
    const other = await createCandidate(coordinator, 'Ravi Menon');
    await assign(coordinator, learner.learnerId, react.id);
    await assign(coordinator, learner.learnerId, sql.id);
    await assign(coordinator, other.learnerId, react.id);

    const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM assignments');
    expect(rows[0].n).toBe(3);
  });

  test.each([['learnerId'], ['activityId']])('requires %s', async (field) => {
    const { coordinator, react, learner } = await basics();
    const body = { learnerId: learner.learnerId, activityId: react.id };
    delete body[field];
    const res = await coordinator.post('/api/v1/assignments', body);
    expect(res.status).toBe(400);
  });

  test.each([['abc'], [1.5], [0], [-1], [null]])(
    'rejects a learner id of %p',
    async (learnerId) => {
      const { coordinator, react } = await basics();
      const res = await coordinator.post('/api/v1/assignments', {
        learnerId,
        activityId: react.id,
      });
      expect(res.status).toBe(400);
    }
  );

  test('answers 404 for a learner that does not exist', async () => {
    const { coordinator, react } = await basics();
    const res = await coordinator.post('/api/v1/assignments', {
      learnerId: 9999,
      activityId: react.id,
    });
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Learner not found.');
  });

  test('answers 404 for an activity that does not exist', async () => {
    const { coordinator, learner } = await basics();
    const res = await coordinator.post('/api/v1/assignments', {
      learnerId: learner.learnerId,
      activityId: 9999,
    });
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Activity not found.');
  });

  test("shows a learner's assignments with activity details", async () => {
    const { coordinator, react, learner } = await basics();
    await assign(coordinator, learner.learnerId, react.id);
    const res = await coordinator.get(`/api/v1/learners/${learner.learnerId}/assignments`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].activity.title).toBe('React Basics');
    expect(res.body[0].status).toBe('Not Started');
  });

  test('answers 404 when viewing the progress of a missing learner', async () => {
    const { coordinator } = await basics();
    const res = await coordinator.get('/api/v1/learners/9999/assignments');
    expect(res.status).toBe(404);
  });
});

describe('My Training and status updates (candidate)', () => {
  test('shows only my own assignments', async () => {
    const { coordinator, react, sql, alice, bob } = await withCandidates();
    await assign(coordinator, alice.learnerId, react.id);
    await assign(coordinator, bob.learnerId, sql.id);

    const res = await alice.client.get('/api/v1/me/assignments');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].learnerId).toBe(alice.learnerId);
    expect(res.body[0].activity.title).toBe('React Basics');
  });

  test('shows an empty list when nothing is assigned yet', async () => {
    const { alice } = await withCandidates();
    const res = await alice.client.get('/api/v1/me/assignments');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('ignores a learner id added to the address', async () => {
    const { coordinator, react, sql, alice, bob } = await withCandidates();
    await assign(coordinator, alice.learnerId, react.id);
    await assign(coordinator, bob.learnerId, sql.id);

    const res = await alice.client.get(`/api/v1/me/assignments?learnerId=${bob.learnerId}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body.every((item) => item.learnerId === alice.learnerId)).toBe(true);
  });

  test('lets a candidate update the status of their own assignment', async () => {
    const { coordinator, react, alice } = await withCandidates();
    const assignment = await assign(coordinator, alice.learnerId, react.id);

    const res = await alice.client.patch(statusUrl(assignment.id), { status: 'In Progress' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('In Progress');
    expect(res.body.activity.title).toBe('React Basics');

    const training = await alice.client.get('/api/v1/me/assignments');
    expect(training.body[0].status).toBe('In Progress');
  });

  test.each([[{ status: 'Finished' }], [{}], [{ status: 5 }]])(
    'rejects the status body %j',
    async (body) => {
      const { coordinator, react, alice } = await withCandidates();
      const assignment = await assign(coordinator, alice.learnerId, react.id);
      const res = await alice.client.patch(statusUrl(assignment.id), body);
      expect(res.status).toBe(400);
    }
  );

  test('answers 404 for an assignment that does not exist', async () => {
    const { alice } = await withCandidates();
    const res = await alice.client.patch(statusUrl(9999), { status: 'Completed' });
    expect(res.status).toBe(404);
  });

  test("does not let a candidate update another candidate's assignment", async () => {
    const { coordinator, react, alice, bob } = await withCandidates();
    const bobAssignment = await assign(coordinator, bob.learnerId, react.id);

    const res = await alice.client.patch(statusUrl(bobAssignment.id), { status: 'Completed' });
    expect(res.status).toBe(403);

    const { rows } = await pool.query('SELECT status FROM assignments WHERE id = $1', [
      bobAssignment.id,
    ]);
    expect(rows[0].status).toBe('Not Started');
  });

  test('does not accept a learner id in the body as proof of identity', async () => {
    const { coordinator, react, alice, bob } = await withCandidates();
    const bobAssignment = await assign(coordinator, bob.learnerId, react.id);

    const res = await alice.client.patch(statusUrl(bobAssignment.id), {
      status: 'Completed',
      learnerId: bob.learnerId,
    });
    expect(res.status).toBe(403);

    const { rows } = await pool.query('SELECT status FROM assignments WHERE id = $1', [
      bobAssignment.id,
    ]);
    expect(rows[0].status).toBe('Not Started');
  });

  test('blocks a candidate who has not changed the temporary password yet', async () => {
    const coordinator = await loginAsCoordinator();
    const activity = await createActivity(coordinator);
    const candidate = await createCandidate(coordinator);
    const assignment = await assign(coordinator, candidate.learnerId, activity.id);

    const client = newClient();
    await client.post(LOGIN, { email: candidate.email, password: candidate.temporaryPassword });
    const res = await client.patch(statusUrl(assignment.id), { status: 'Completed' });
    expect(res.status).toBe(403);

    const { rows } = await pool.query('SELECT status FROM assignments WHERE id = $1', [
      assignment.id,
    ]);
    expect(rows[0].status).toBe('Not Started');
  });

  test('does not let a candidate assign, view learner progress or read the summary', async () => {
    const { react, alice, bob } = await withCandidates();

    const assignRes = await alice.client.post('/api/v1/assignments', {
      learnerId: alice.learnerId,
      activityId: react.id,
    });
    expect(assignRes.status).toBe(403);
    const progress = await alice.client.get(`/api/v1/learners/${bob.learnerId}/assignments`);
    expect(progress.status).toBe(403);
    expect((await alice.client.get('/api/v1/cohort-summary')).status).toBe(403);

    const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM assignments');
    expect(rows[0].n).toBe(0);
  });

  test('does not let the coordinator use the candidate routes', async () => {
    const { coordinator, react, alice } = await withCandidates();
    const assignment = await assign(coordinator, alice.learnerId, react.id);

    expect((await coordinator.get('/api/v1/me/assignments')).status).toBe(403);
    const update = await coordinator.patch(statusUrl(assignment.id), { status: 'Completed' });
    expect(update.status).toBe(403);
  });

  test('refuses signed out visitors', async () => {
    const visitor = newClient();
    expect((await visitor.get('/api/v1/me/assignments')).status).toBe(401);
    expect((await visitor.patch(statusUrl(1), { status: 'Completed' })).status).toBe(401);
  });
});

describe('cohort summary', () => {
  test('shows zeros when there is no data', async () => {
    const coordinator = await loginAsCoordinator();
    const res = await coordinator.get('/api/v1/cohort-summary');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ learners: 0, assignments: 0, completed: 0 });
  });

  test('is counted from the saved data', async () => {
    const { coordinator, react, sql, alice, bob } = await withCandidates();
    const first = await assign(coordinator, alice.learnerId, react.id);
    await assign(coordinator, alice.learnerId, sql.id);
    await assign(coordinator, bob.learnerId, react.id);
    const done = await alice.client.patch(statusUrl(first.id), { status: 'Completed' });
    expect(done.status).toBe(200);

    const summary = await coordinator.get('/api/v1/cohort-summary');
    expect(summary.status).toBe(200);
    expect(summary.body).toEqual({ learners: 2, assignments: 3, completed: 1 });

    const { rows } = await pool.query(
      `SELECT (SELECT COUNT(*) FROM learners)::int AS learners,
              (SELECT COUNT(*) FROM assignments)::int AS assignments,
              (SELECT COUNT(*) FROM assignments WHERE status = 'Completed')::int AS completed`
    );
    expect(summary.body).toEqual(rows[0]);
  });

  test('can only be read by the coordinator', async () => {
    const coordinator = await loginAsCoordinator();
    const candidate = await signedInCandidate(coordinator);
    expect((await candidate.client.get('/api/v1/cohort-summary')).status).toBe(403);
    expect((await newClient().get('/api/v1/cohort-summary')).status).toBe(401);
  });
});