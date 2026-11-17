const {
  pool,
  resetDb,
  newClient,
  loginAsCoordinator,
  signedInCandidate,
  createActivity,
} = require('./helpers');

beforeEach(resetDb);
afterAll(() => pool.end());

const validBody = (overrides = {}) => ({
  title: 'Git Basics',
  topic: 'Tools',
  plannedHours: 3,
  ...overrides,
});

describe('activities', () => {
  test('shows an empty list when there are no activities', async () => {
    const coordinator = await loginAsCoordinator();
    const res = await coordinator.get('/api/v1/activities');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('creates an activity and returns it', async () => {
    const coordinator = await loginAsCoordinator();
    const res = await coordinator.post('/api/v1/activities', validBody());
    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      id: expect.any(Number),
      title: 'Git Basics',
      topic: 'Tools',
      plannedHours: 3,
    });
  });

  test('keeps saved activities in the list', async () => {
    const coordinator = await loginAsCoordinator();
    await createActivity(coordinator, { title: 'React Basics' });
    const res = await coordinator.get('/api/v1/activities');
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('React Basics');
  });

  test.each([['title'], ['topic'], ['plannedHours']])('requires %s', async (field) => {
    const coordinator = await loginAsCoordinator();
    const body = validBody();
    delete body[field];
    const res = await coordinator.post('/api/v1/activities', body);
    expect(res.status).toBe(400);
    expect(res.body.message).toBeDefined();
  });

  test('rejects a title made only of spaces', async () => {
    const coordinator = await loginAsCoordinator();
    const res = await coordinator.post('/api/v1/activities', validBody({ title: '   ' }));
    expect(res.status).toBe(400);
  });

  test.each([[0], [-2], ['abc'], [null]])('rejects planned hours of %p', async (hours) => {
    const coordinator = await loginAsCoordinator();
    const res = await coordinator.post('/api/v1/activities', validBody({ plannedHours: hours }));
    expect(res.status).toBe(400);
  });

  test('saves nothing when the data is invalid', async () => {
    const coordinator = await loginAsCoordinator();
    await coordinator.post('/api/v1/activities', validBody({ title: '' }));
    const res = await coordinator.get('/api/v1/activities');
    expect(res.body).toEqual([]);
  });

  test('edits an activity and keeps the change', async () => {
    const coordinator = await loginAsCoordinator();
    const activity = await createActivity(coordinator);
    const res = await coordinator.put(`/api/v1/activities/${activity.id}`, {
      title: 'React Advanced',
      topic: 'Frontend',
      plannedHours: 8,
    });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('React Advanced');

    const list = await coordinator.get('/api/v1/activities');
    expect(list.body[0]).toMatchObject({ title: 'React Advanced', plannedHours: 8 });
  });

  test('applies the same rules when editing', async () => {
    const coordinator = await loginAsCoordinator();
    const activity = await createActivity(coordinator);
    const res = await coordinator.put(
      `/api/v1/activities/${activity.id}`,
      validBody({ plannedHours: 0 })
    );
    expect(res.status).toBe(400);
  });

  test('answers 404 when editing an activity that does not exist', async () => {
    const coordinator = await loginAsCoordinator();
    const res = await coordinator.put('/api/v1/activities/9999', validBody());
    expect(res.status).toBe(404);
  });

  test('does not let a candidate list, create or edit activities', async () => {
    const coordinator = await loginAsCoordinator();
    const activity = await createActivity(coordinator);
    const candidate = await signedInCandidate(coordinator);

    expect((await candidate.client.get('/api/v1/activities')).status).toBe(403);
    expect((await candidate.client.post('/api/v1/activities', validBody())).status).toBe(403);
    const edit = await candidate.client.put(`/api/v1/activities/${activity.id}`, validBody());
    expect(edit.status).toBe(403);

    const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM activities');
    expect(rows[0].n).toBe(1);
  });

  test('does not let a signed out visitor list activities', async () => {
    const res = await newClient().get('/api/v1/activities');
    expect(res.status).toBe(401);
  });
});