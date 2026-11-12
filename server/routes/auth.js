const express = require('express');
const router = express.Router();
const { query, get, run } = require('../db');
const { hashPassword, verifyPassword, createSession, deleteSession, requireAuth } = require('../auth');

/**
 * POST /api/auth/register
 * Register a new user account
 */
router.post('/register', (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Full name is required' });
    }
    if (!email || !email.trim() || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email address is required' });
    }
    if (!phone || !phone.trim()) {
      return res.status(400).json({ error: 'Phone number is required' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = get('SELECT id FROM users WHERE email = ?', [cleanEmail]);
    if (existing) {
      return res.status(400).json({ error: 'An account with this email already exists' });
    }

    const userId = 'user-' + Date.now() + '-' + Math.floor(1000 + Math.random() * 9000);
    const passHash = hashPassword(password);

    run(`
      INSERT INTO users (id, name, email, phone, password_hash, role)
      VALUES (?, ?, ?, ?, ?, 'user')
    `, [userId, name.trim(), cleanEmail, phone.trim(), passHash]);

    // Also populate or update customer_profiles
    run(`
      INSERT INTO customer_profiles (name, phone, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(phone) DO UPDATE SET
        name = excluded.name,
        updated_at = CURRENT_TIMESTAMP
    `, [name.trim(), phone.trim()]);

    const { token, expiresAt } = createSession(userId);

    res.status(201).json({
      token,
      expiresAt,
      user: {
        id: userId,
        name: name.trim(),
        email: cleanEmail,
        phone: phone.trim(),
        role: 'user'
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create account', details: err.message });
  }
});

/**
 * POST /api/auth/login
 * Log in with email and password
 */
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = get('SELECT * FROM users WHERE email = ?', [cleanEmail]);

    if (!user || !verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const { token, expiresAt } = createSession(user.id);

    res.json({
      token,
      expiresAt,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to sign in', details: err.message });
  }
});

/**
 * POST /api/auth/logout
 * Invalidate current session token
 */
router.post('/logout', (req, res) => {
  try {
    if (req.token) {
      deleteSession(req.token);
    }
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to logout', details: err.message });
  }
});

/**
 * GET /api/auth/me
 * Return currently authenticated user profile
 */
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
