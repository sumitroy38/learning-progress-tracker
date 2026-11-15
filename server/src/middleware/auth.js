// Stops people who are not signed in
function requireAuth(req, res, next) {
  if (!req.session || !req.session.accountId) {
    return res.status(401).json({ message: 'Please sign in.' });
  }
  next();
}

// Allows one role only, for example requireRole('Coordinator')
function requireRole(role) {
  return (req, res, next) => {
    if (req.session.role !== role) {
      return res.status(403).json({ message: 'You do not have permission to do this.' });
    }
    next();
  };
}

// The only paths a person with a temporary password may use
const ALLOWED_BEFORE_PASSWORD_CHANGE = new Set([
  '/health',
  '/auth/csrf-token',
  '/auth/login',
  '/auth/me',
  '/auth/change-password',
  '/auth/logout',
]);

// The gate: blocks everything else until the temporary password is changed
function firstLoginGate(req, res, next) {
  const locked = req.session && req.session.accountId && req.session.mustChangePassword;
  if (locked && !ALLOWED_BEFORE_PASSWORD_CHANGE.has(req.path)) {
    return res.status(403).json({ message: 'Please change your temporary password first.' });
  }
  next();
}

module.exports = { requireAuth, requireRole, firstLoginGate };