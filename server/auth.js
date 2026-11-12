const crypto = require('node:crypto');
const { query, get, run } = require('./db');

/**
 * Hash a plain password using PBKDF2 with a random salt
 */
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verify a plain password against a stored salt:hash string
 */
function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, originalHash] = storedHash.split(':');
  const computedHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return computedHash === originalHash;
}

/**
 * Create a new user session and return bearer token
 */
function createSession(userId, daysValid = 30) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + daysValid * 24 * 60 * 60 * 1000).toISOString();
  
  run('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)', [token, userId, expiresAt]);
  return { token, expiresAt };
}

/**
 * Invalidate a session token
 */
function deleteSession(token) {
  if (!token) return;
  run('DELETE FROM sessions WHERE token = ?', [token]);
}

/**
 * Find user associated with an active token
 */
function getUserByToken(token) {
  if (!token) return null;
  const session = get(`
    SELECT s.token, s.expires_at, u.id, u.name, u.email, u.phone, u.role, u.created_at
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.token = ?
  `, [token]);

  if (!session) return null;

  // Check expiration
  if (new Date(session.expires_at) < new Date()) {
    deleteSession(token);
    return null;
  }

  return {
    id: session.id,
    name: session.name,
    email: session.email,
    phone: session.phone,
    role: session.role,
    createdAt: session.created_at
  };
}

/**
 * Express middleware to attach user to request if token present
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  let token = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  } else if (req.headers['x-auth-token']) {
    token = String(req.headers['x-auth-token']).trim();
  } else if (req.query && req.query.token) {
    token = String(req.query.token).trim();
  }

  if (token) {
    const user = getUserByToken(token);
    if (user) {
      req.user = user;
      req.token = token;
    }
  }

  next();
}

/**
 * Middleware requiring any authenticated user
 */
function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required. Please sign in or create an account to proceed.',
      requiresAuth: true
    });
  }
  next();
}

/**
 * Middleware requiring admin role
 */
function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required. Please sign in as an administrator.',
      requiresAuth: true
    });
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Access denied. Administrator privileges required.'
    });
  }
  next();
}

module.exports = {
  hashPassword,
  verifyPassword,
  createSession,
  deleteSession,
  getUserByToken,
  authMiddleware,
  requireAuth,
  requireAdmin
};
