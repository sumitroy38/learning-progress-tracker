const {
  pool,
  resetDb,
  newClient,
  strongPassword,
  loginAsCoordinator,
  createActivity,
  assign,
} = require('./helpers');

beforeEach(resetDb);
afterAll(() => pool.end());

test('onboarding, assigning, progress and the summary work from start to finish', async () => {
  const coordinator = await loginAsCoordinator();

  // The coordinator makes an activity
  const activity = await createActivity(coordinator, {
    title: 'React Basics',
    topic: 'Frontend',
    plannedHours: 6,
  });

  // The coordinator adds a candidate and gets one time credentials
  const body = { name: 'Asha Verma', email: 'asha.verma@example.com', cohort: 'Cohort A' };
  const created = await coordinator.post('/api/v1/learners', body);
  expect(created.status).toBe(201);
  const { username, temporaryPassword } = created.body.credentials;
  const learnerId = created.body.learner.id;

  // The same email cannot be used twice
  expect((await coordinator.post('/api/v1/learners', body)).status).toBe(409);

  // The candidate signs in but is locked until the password is changed
  const candidate = newClient();
  const signIn = await candidate.post('/api/v1/auth/login', {
    email: username,
    password: temporaryPassword,
  });
  expect(signIn.status).toBe(200);
  expect(signIn.body.mustChangePassword).toBe(true);
  expect((await candidate.get('/api/v1/me/assignments')).status).toBe(403);

  // The candidate replaces the temporary password
  const newPassword = strongPassword();
  const changed = await candidate.post('/api/v1/auth/change-password', {
    currentPassword: temporaryPassword,
    newPassword,
  });
  expect(changed.status).toBe(204);

  // The coordinator assigns training and the candidate sees it
  const assignment = await assign(coordinator, learnerId, activity.id);
  const training = await candidate.get('/api/v1/me/assignments');
  expect(training.status).toBe(200);
  expect(training.body).toHaveLength(1);
  expect(training.body[0]).toMatchObject({
    status: 'Not Started',
    activity: { title: 'React Basics', plannedHours: 6 },
  });

  // The candidate finishes it
  const update = await candidate.patch(`/api/v1/assignments/${assignment.id}/status`, {
    status: 'Completed',
  });
  expect(update.status).toBe(200);

  // The coordinator sees the progress and the summary matches
  const progress = await coordinator.get(`/api/v1/learners/${learnerId}/assignments`);
  expect(progress.body[0].status).toBe('Completed');
  const summary = await coordinator.get('/api/v1/cohort-summary');
  expect(summary.body).toEqual({ learners: 1, assignments: 1, completed: 1 });

  // Logging out ends the session
  expect((await candidate.post('/api/v1/auth/logout')).status).toBe(204);
  expect((await candidate.get('/api/v1/me/assignments')).status).toBe(401);

  // Signing in again is like a page refresh: the saved status is still there
  const again = newClient();
  const secondSignIn = await again.post('/api/v1/auth/login', {
    email: username,
    password: newPassword,
  });
  expect(secondSignIn.status).toBe(200);
  expect(secondSignIn.body.mustChangePassword).toBe(false);
  const after = await again.get('/api/v1/me/assignments');
  expect(after.body[0].status).toBe('Completed');

  const { rows } = await pool.query('SELECT status FROM assignments WHERE id = $1', [
    assignment.id,
  ]);
  expect(rows[0].status).toBe('Completed');
});