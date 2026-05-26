const router = require('express').Router();
const { pool } = require('../models/db');
const { authenticate, requireAdmin, requireHeadAdmin } = require('../middleware/auth');
const { sendEmail, emailTemplates } = require('../utils/email');
const { auditLog, createNotification } = require('../utils/audit');

// All admin routes require authentication + admin role
router.use(authenticate, requireAdmin);

// GET /api/admin/requests — list pending admin requests (head_admin only)
router.get('/requests', requireHeadAdmin, async (req, res) => {
  try {
    const { status = 'pending' } = req.query;
    const result = await pool.query(`
      SELECT ar.*, 
        u.fullname, u.email, u.branch_name, u.division, u.created_at as user_created_at,
        r.fullname as reviewed_by_name
      FROM admin_requests ar
      JOIN users u ON ar.user_id = u.id
      LEFT JOIN users r ON ar.reviewed_by = r.id
      WHERE ($1 = 'all' OR ar.status = $1)
      ORDER BY ar.created_at DESC
    `, [status]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

// POST /api/admin/requests/:id/approve — approve admin request (head_admin only)
router.post('/requests/:id/approve', requireHeadAdmin, async (req, res) => {
  const { id } = req.params;
  const { note } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const reqResult = await client.query(
      'SELECT * FROM admin_requests WHERE id = $1', [id]
    );
    if (!reqResult.rows.length) return res.status(404).json({ error: 'Request not found' });
    const adminReq = reqResult.rows[0];
    if (adminReq.status !== 'pending') return res.status(400).json({ error: 'Request already processed' });

    // Approve request
    await client.query(`
      UPDATE admin_requests 
      SET status = 'approved', reviewed_by = $1, review_note = $2, reviewed_at = NOW()
      WHERE id = $3
    `, [req.user.id, note || null, id]);

    // Elevate user to admin
    await client.query(`
      UPDATE users 
      SET role = 'admin', status = 'active', admin_approved_by = $1, admin_approved_at = NOW()
      WHERE id = $2
    `, [req.user.id, adminReq.user_id]);

    // Get updated user
    const userResult = await client.query('SELECT * FROM users WHERE id = $1', [adminReq.user_id]);
    const user = userResult.rows[0];

    await client.query('COMMIT');

    // Notify user
    const { subject, html } = emailTemplates.adminRequestApproved(user);
    await sendEmail({ to: user.email, subject, html });
    await createNotification(user.id, 'Admin Access Approved', 'Your admin request has been approved by the Head Administrator.', 'success', '/dashboard');

    await auditLog(req.user.id, 'ADMIN_REQUEST_APPROVED', 'admin_request', id, { userId: adminReq.user_id }, req);

    res.json({ message: 'Admin request approved', userId: adminReq.user_id });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to approve request' });
  } finally {
    client.release();
  }
});

// POST /api/admin/requests/:id/reject — reject admin request (head_admin only)
router.post('/requests/:id/reject', requireHeadAdmin, async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  try {
    const reqResult = await pool.query('SELECT * FROM admin_requests WHERE id = $1', [id]);
    if (!reqResult.rows.length) return res.status(404).json({ error: 'Request not found' });
    const adminReq = reqResult.rows[0];

    await pool.query(`
      UPDATE admin_requests 
      SET status = 'rejected', reviewed_by = $1, review_note = $2, reviewed_at = NOW()
      WHERE id = $3
    `, [req.user.id, reason || null, id]);

    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [adminReq.user_id]);
    const user = userResult.rows[0];

    const { subject, html } = emailTemplates.adminRequestRejected(user, reason);
    await sendEmail({ to: user.email, subject, html });
    await createNotification(user.id, 'Admin Request Update', 'Your admin request was not approved.', 'error');

    await auditLog(req.user.id, 'ADMIN_REQUEST_REJECTED', 'admin_request', id, { reason }, req);

    res.json({ message: 'Request rejected' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to reject request' });
  }
});

// GET /api/admin/users — list all users
router.get('/users', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, fullname, email, role, status, branch_name, division, phone, last_login, created_at
      FROM users ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// PUT /api/admin/users/:id/status — suspend/activate user (head_admin only)
router.put('/users/:id/status', requireHeadAdmin, async (req, res) => {
  const { status } = req.body;
  const { id } = req.params;
  if (!['active', 'suspended'].includes(status)) return res.status(400).json({ error: 'Invalid status' });

  try {
    const target = await pool.query('SELECT role FROM users WHERE id = $1', [id]);
    if (!target.rows.length) return res.status(404).json({ error: 'User not found' });
    if (target.rows[0].role === 'head_admin') return res.status(403).json({ error: 'Cannot modify head admin' });

    await pool.query('UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2', [status, id]);
    await auditLog(req.user.id, `USER_${status.toUpperCase()}`, 'user', id, {}, req);
    res.json({ message: `User ${status}` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

// GET /api/admin/stats — dashboard stats
router.get('/stats', async (req, res) => {
  try {
    const [reports, users, pending, approved, rejected, revenue] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM monthly_reports WHERE status != 'draft'"),
      pool.query("SELECT COUNT(*) FROM users WHERE role = 'branch' AND status = 'active'"),
      pool.query("SELECT COUNT(*) FROM monthly_reports WHERE status = 'submitted'"),
      pool.query("SELECT COUNT(*) FROM monthly_reports WHERE status = 'approved'"),
      pool.query("SELECT COUNT(*) FROM monthly_reports WHERE status = 'rejected'"),
      pool.query("SELECT COALESCE(SUM(total_amount_remitted),0) as total FROM monthly_reports WHERE status = 'approved'"),
    ]);
    const branches = await pool.query("SELECT COUNT(DISTINCT branch) FROM monthly_reports");
    const adminRequests = await pool.query("SELECT COUNT(*) FROM admin_requests WHERE status = 'pending'");

    res.json({
      totalReports: parseInt(reports.rows[0].count),
      totalBranchUsers: parseInt(users.rows[0].count),
      pendingReports: parseInt(pending.rows[0].count),
      approvedReports: parseInt(approved.rows[0].count),
      rejectedReports: parseInt(rejected.rows[0].count),
      totalRevenue: parseFloat(revenue.rows[0].total),
      totalBranches: parseInt(branches.rows[0].count),
      pendingAdminRequests: parseInt(adminRequests.rows[0].count),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// GET /api/admin/audit-logs
router.get('/audit-logs', async (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  try {
    const offset = (page - 1) * limit;
    const result = await pool.query(`
      SELECT al.*, u.fullname, u.email
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ORDER BY al.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// GET /api/admin/notifications
router.get('/notifications', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// PUT /api/admin/notifications/:id/read
router.put('/notifications/:id/read', async (req, res) => {
  await pool.query('UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
  res.json({ ok: true });
});

module.exports = router;
