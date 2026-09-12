const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET must be configured in the backend environment.');
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';

  if (!token) {
    return res.status(401).json({ message: 'Authentication is required.' });
  }

  try {
    req.auth = jwt.verify(token, JWT_SECRET);
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Your session has expired. Please sign in again.' });
  }
}

function createToken(userId) {
  return jwt.sign({ userId: String(userId) }, JWT_SECRET, { expiresIn: '7d' });
}

function requireUserMatch(req, res, next) {
  const requestedUserId = req.params.userId || req.body?.userId || req.body?.userAccount;
  if (!requestedUserId || String(requestedUserId) !== String(req.auth.userId)) {
    return res.status(403).json({ message: 'You do not have access to this user data.' });
  }
  return next();
}

module.exports = { createToken, requireAuth, requireUserMatch };
