const { requireAuth, requireRole, firstLoginGate } = require('../../src/middleware/auth');

// A fake response that remembers what the middleware did
function fakeRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('requireAuth', () => {
  test('answers 401 when there is no session', () => {
    const res = fakeRes();
    const next = jest.fn();
    requireAuth({}, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('answers 401 when the session has no account', () => {
    const res = fakeRes();
    const next = jest.fn();
    requireAuth({ session: {} }, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('lets a signed in user through', () => {
    const res = fakeRes();
    const next = jest.fn();
    requireAuth({ session: { accountId: 1 } }, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe('requireRole', () => {
  test('answers 403 for the wrong role', () => {
    const res = fakeRes();
    const next = jest.fn();
    requireRole('Coordinator')({ session: { role: 'Candidate' } }, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('lets the right role through', () => {
    const res = fakeRes();
    const next = jest.fn();
    requireRole('Coordinator')({ session: { role: 'Coordinator' } }, res, next);
    expect(next).toHaveBeenCalled();
  });
});

describe('firstLoginGate', () => {
  const locked = { accountId: 1, role: 'Candidate', mustChangePassword: true };

  test('does not bother visitors who are not signed in', () => {
    const next = jest.fn();
    firstLoginGate({ session: {}, path: '/activities' }, fakeRes(), next);
    expect(next).toHaveBeenCalled();
  });

  test('does not bother users who already changed the password', () => {
    const next = jest.fn();
    const session = { ...locked, mustChangePassword: false };
    firstLoginGate({ session, path: '/me/assignments' }, fakeRes(), next);
    expect(next).toHaveBeenCalled();
  });

  test.each([['/me/assignments'], ['/activities'], ['/learners'], ['/assignments/1/status']])(
    'blocks a locked user on %s',
    (path) => {
      const res = fakeRes();
      const next = jest.fn();
      firstLoginGate({ session: locked, path }, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    }
  );

  test.each([['/auth/change-password'], ['/auth/logout'], ['/auth/me'], ['/health']])(
    'lets a locked user use %s',
    (path) => {
      const next = jest.fn();
      firstLoginGate({ session: locked, path }, fakeRes(), next);
      expect(next).toHaveBeenCalled();
    }
  );
});