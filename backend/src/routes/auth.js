const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { pool } = require('../models/db');
const { authenticate } = require('../middleware/auth');
const { sendEmail, emailTemplates } = require('../utils/email');
const { auditLog, createNotification } = require('../utils/audit');

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
  const refreshToken = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: '30d' });
  return { accessToken, refreshToken };
};

// POST /api/auth/register
router.post('/register', [
  body('fullname').trim().isLength({ min: 2 }).withMessage('Full name required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('branch_name').trim().notEmpty().withMessage('Branch name required'),
  body('division').trim().notEmpty().withMessage('Division required'),
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { fullname, email, password, branch_name, division, phone } = req.body;

  try {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length) return res.status(409).json({ error: 'Email already registered' });

    const hash = await bcrypt.hash(password, 12);
    const result = await pool.query(`
      INSERT INTO users (fullname, email, password_hash, role, status, branch_name, division, phone)
      VALUES ($1, $2, $3, 'branch', 'active', $4, $5, $6)
      RETURNING id, fullname, email, role, status, branch_name, division
    `, [fullname, email, hash, branch_name, division, phone || null]);

    const user = result.rows[0];
    const { accessToken, refreshToken } = generateTokens(user.id);

    await pool.query(`
      INSERT INTO refresh_tokens (user_id, token, expires_at)
      VALUES ($1, $2, NOW() + INTERVAL '30 days')
    `, [user.id, refreshToken]);

    await auditLog(user.id, 'USER_REGISTERED', 'user', user.id, { email }, req);

    res.status(201).json({ user, accessToken, refreshToken });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, password } = req.body;

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (!result.rows.length) return res.status(401).json({ error: 'Invalid credentials' });

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    if (user.status === 'suspended') return res.status(403).json({ error: 'Account suspended. Contact administrator.' });
    if (user.status === 'pending') return res.status(403).json({ error: 'Account pending approval.' });

    const { accessToken, refreshToken } = generateTokens(user.id);

    await pool.query(`
      INSERT INTO refresh_tokens (user_id, token, expires_at)
      VALUES ($1, $2, NOW() + INTERVAL '30 days')
    `, [user.id, refreshToken]);

    await pool.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);
    await auditLog(user.id, 'USER_LOGIN', 'user', user.id, { email }, req);

    const { password_hash, ...safeUser } = user;
    res.json({ user: safeUser, accessToken, refreshToken });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res, next) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(401).json({ error: 'No refresh token' });

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const stored = await pool.query(
      'SELECT * FROM refresh_tokens WHERE token = $1 AND user_id = $2 AND expires_at > NOW()',
      [refreshToken, decoded.userId]
    );
    if (!stored.rows.length) return res.status(401).json({ error: 'Invalid refresh token' });

    const tokens = generateTokens(decoded.userId);
    await pool.query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
    await pool.query(`
      INSERT INTO refresh_tokens (user_id, token, expires_at)
      VALUES ($1, $2, NOW() + INTERVAL '30 days')
    `, [decoded.userId, tokens.refreshToken]);

    res.json(tokens);
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    next(err);
  }
});

// POST /api/auth/logout
router.post('/logout', authenticate, async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await pool.query('DELETE FROM refresh_tokens WHERE token = $1 AND user_id = $2', [refreshToken, req.user.id]);
    }
    await auditLog(req.user.id, 'USER_LOGOUT', null, null, {}, req);
    res.json({ message: 'Logged out' });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT id, fullname, email, role, status, branch_name, division, phone, last_login, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/request-admin
router.post('/request-admin', authenticate, [
  body('reason').trim().isLength({ min: 20 }).withMessage('Please provide a detailed reason (min 20 characters)'),
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  if (req.user.role !== 'branch') {
    return res.status(400).json({ error: 'Only branch users can request admin access' });
  }

  const { reason } = req.body;

  try {
    const existing = await pool.query(
      "SELECT id FROM admin_requests WHERE user_id = $1 AND status = 'pending'",
      [req.user.id]
    );
    if (existing.rows.length) {
      return res.status(409).json({ error: 'You already have a pending admin request' });
    }

    const result = await pool.query(`
      INSERT INTO admin_requests (user_id, requested_role, reason)
      VALUES ($1, 'admin', $2)
      RETURNING *
    `, [req.user.id, reason]);

    await pool.query('UPDATE users SET admin_request_note = $1 WHERE id = $2', [reason, req.user.id]);

    const headAdmin = await pool.query("SELECT * FROM users WHERE role = 'head_admin' LIMIT 1");
    if (headAdmin.rows.length) {
      const { subject, html } = emailTemplates.adminRequestNotifyHeadAdmin(req.user, reason);
      await sendEmail({ to: headAdmin.rows[0].email, subject, html });
      await createNotification(
        headAdmin.rows[0].id,
        'New Admin Request',
        `${req.user.fullname} (${req.user.branch_name}) has requested admin access.`,
        'warning',
        '/admin/requests'
      );
    }

    const confirmEmail = emailTemplates.adminRequestReceived(req.user);
    await sendEmail({ to: req.user.email, subject: confirmEmail.subject, html: confirmEmail.html });

    await auditLog(req.user.id, 'ADMIN_REQUEST_SUBMITTED', 'admin_request', result.rows[0].id, { reason }, req);

    res.status(201).json({ message: 'Admin request submitted. You will be notified by email.', request: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
