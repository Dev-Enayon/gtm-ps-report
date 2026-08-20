const router = require('express').Router();
const { pool } = require('../models/db');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { sendEmail, emailTemplates } = require('../utils/email');
const { auditLog, createNotification } = require('../utils/audit');

router.use(authenticate);

// GET /api/reports/analytics/summary — MUST be before /:id to avoid route collision
router.get('/analytics/summary', requireAdmin, async (req, res) => {
  try {
    const monthly = await pool.query(`
      SELECT month, year,
        SUM(total_attendance) as total_attendance,
        SUM(total_amount_remitted) as total_remitted,
        SUM(total_new_converts) as total_converts,
        COUNT(*) as report_count
      FROM monthly_reports WHERE status = 'approved'
      GROUP BY month, year ORDER BY year DESC,
        CASE month WHEN 'January' THEN 1 WHEN 'February' THEN 2 WHEN 'March' THEN 3
          WHEN 'April' THEN 4 WHEN 'May' THEN 5 WHEN 'June' THEN 6
          WHEN 'July' THEN 7 WHEN 'August' THEN 8 WHEN 'September' THEN 9
          WHEN 'October' THEN 10 WHEN 'November' THEN 11 WHEN 'December' THEN 12 END
      LIMIT 12
    `);
    const byBranch = await pool.query(`
      SELECT branch, SUM(total_amount_remitted) as total_remitted,
        SUM(total_attendance) as total_attendance, COUNT(*) as reports
      FROM monthly_reports WHERE status = 'approved'
      GROUP BY branch ORDER BY total_remitted DESC LIMIT 10
    `);
    res.json({ monthly: monthly.rows, byBranch: byBranch.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// GET /api/reports — list reports (admin sees all, branch sees own)
router.get('/', async (req, res) => {
  const { month, year, branch, status, division, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  const isAdmin = ['admin', 'head_admin'].includes(req.user.role);

  try {
    const conditions = [];
    const params = [];
    let idx = 1;

    if (!isAdmin) { conditions.push(`r.user_id = $${idx++}`); params.push(req.user.id); }
    if (month) { conditions.push(`r.month = $${idx++}`); params.push(month); }
    if (year) { conditions.push(`r.year = $${idx++}`); params.push(parseInt(year)); }
    if (branch) { conditions.push(`r.branch ILIKE $${idx++}`); params.push(`%${branch}%`); }
    if (status) { conditions.push(`r.status = $${idx++}`); params.push(status); }
    if (division) { conditions.push(`r.division = $${idx++}`); params.push(division); }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const [data, count] = await Promise.all([
      pool.query(`
        SELECT r.*, u.fullname as submitted_by_name, u.email as submitted_by_email,
          rev.fullname as reviewed_by_name
        FROM monthly_reports r
        JOIN users u ON r.user_id = u.id
        LEFT JOIN users rev ON r.reviewed_by = rev.id
        ${where}
        ORDER BY r.created_at DESC
        LIMIT $${idx} OFFSET $${idx + 1}
      `, [...params, limit, offset]),
      pool.query(`SELECT COUNT(*) FROM monthly_reports r ${where}`, params),
    ]);

    res.json({
      reports: data.rows,
      total: parseInt(count.rows[0].count),
      page: parseInt(page),
      pages: Math.ceil(count.rows[0].count / limit),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// GET /api/reports/:id — single report with attendance rows
router.get('/:id', async (req, res) => {
  const isAdmin = ['admin', 'head_admin'].includes(req.user.role);
  try {
    const result = await pool.query(`
      SELECT r.*, u.fullname as submitted_by_name, u.email as submitted_by_email,
        rev.fullname as reviewed_by_name
      FROM monthly_reports r
      JOIN users u ON r.user_id = u.id
      LEFT JOIN users rev ON r.reviewed_by = rev.id
      WHERE r.id = $1 ${!isAdmin ? 'AND r.user_id = $2' : ''}
    `, isAdmin ? [req.params.id] : [req.params.id, req.user.id]);

    if (!result.rows.length) return res.status(404).json({ error: 'Report not found' });

    const rows = await pool.query(
      'SELECT * FROM attendance_rows WHERE report_id = $1 ORDER BY date ASC',
      [req.params.id]
    );

    res.json({ ...result.rows[0], attendanceRows: rows.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch report' });
  }
});

// POST /api/reports — create new report
router.post('/', async (req, res) => {
  const { division, branch, month, year, attendanceRows = [], financials = {}, status = 'draft' } = req.body;
  if (!division || !branch || !month || !year) return res.status(400).json({ error: 'Division, branch, month and year are required' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Calculate totals from attendance rows
    const totals = attendanceRows.reduce((acc, row) => ({
      men: acc.men + (parseInt(row.attendance_men) || 0),
      women: acc.women + (parseInt(row.attendance_women) || 0),
      children: acc.children + (parseInt(row.attendance_children) || 0),
      newConverts: acc.newConverts + (parseInt(row.new_convert) || 0),
      newGuests: acc.newGuests + (parseInt(row.new_guest) || 0),
      monetary: acc.monetary + (parseFloat(row.monetary_amount) || 0),
    }), { men: 0, women: 0, children: 0, newConverts: 0, newGuests: 0, monetary: 0 });

    const totalAttendance = totals.men + totals.women + totals.children;

    const fin = financials;
    const totalRemitted = [
      fin.workers_tithe_100, fin.workers_tithe_70,
      fin.members_tithe_100, fin.members_tithe_70,
      fin.welfare_offering_100, fin.welfare_offering_90, fin.welfare_offering_10,
      fin.offering_100, fin.offering_70, fin.offering_30,
      fin.wednesday_offering_70, fin.wednesday_offering_30,
      fin.gospel_service_offering_70, fin.gospel_service_offering_30,
    ].reduce((a, v) => a + (parseFloat(v) || 0), 0);

    const reportResult = await client.query(`
      INSERT INTO monthly_reports (
        user_id, division, branch, month, year, status,
        total_men, total_women, total_children, total_attendance,
        total_new_converts, total_new_guests, total_monetary,
        workers_tithe_100, workers_tithe_70, members_tithe_100, members_tithe_70,
        welfare_offering_100, welfare_offering_90, welfare_offering_10,
        offering_100, offering_70, offering_30,
        wednesday_offering_70, wednesday_offering_30,
        gospel_service_offering_70, gospel_service_offering_30,
        total_amount_remitted,
        submitted_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29)
      ON CONFLICT (user_id, month, year, branch) DO UPDATE SET
        division = EXCLUDED.division, status = EXCLUDED.status,
        total_men = EXCLUDED.total_men, total_women = EXCLUDED.total_women,
        total_children = EXCLUDED.total_children, total_attendance = EXCLUDED.total_attendance,
        total_new_converts = EXCLUDED.total_new_converts, total_new_guests = EXCLUDED.total_new_guests,
        total_monetary = EXCLUDED.total_monetary,
        workers_tithe_100 = EXCLUDED.workers_tithe_100, workers_tithe_70 = EXCLUDED.workers_tithe_70,
        members_tithe_100 = EXCLUDED.members_tithe_100, members_tithe_70 = EXCLUDED.members_tithe_70,
        welfare_offering_100 = EXCLUDED.welfare_offering_100, welfare_offering_90 = EXCLUDED.welfare_offering_90,
        welfare_offering_10 = EXCLUDED.welfare_offering_10,
        offering_100 = EXCLUDED.offering_100, offering_70 = EXCLUDED.offering_70,
        offering_30 = EXCLUDED.offering_30,
        wednesday_offering_70 = EXCLUDED.wednesday_offering_70, wednesday_offering_30 = EXCLUDED.wednesday_offering_30,
        gospel_service_offering_70 = EXCLUDED.gospel_service_offering_70,
        gospel_service_offering_30 = EXCLUDED.gospel_service_offering_30,
        total_amount_remitted = EXCLUDED.total_amount_remitted,
        submitted_at = EXCLUDED.submitted_at,
        updated_at = NOW()
      RETURNING *
    `, [
      req.user.id, division, branch, month, parseInt(year),
      status === 'submitted' ? 'submitted' : 'draft',
      totals.men, totals.women, totals.children, totalAttendance,
      totals.newConverts, totals.newGuests, totals.monetary,
      fin.workers_tithe_100 || 0, fin.workers_tithe_70 || 0,
      fin.members_tithe_100 || 0, fin.members_tithe_70 || 0,
      fin.welfare_offering_100 || 0, fin.welfare_offering_90 || 0, fin.welfare_offering_10 || 0,
      fin.offering_100 || 0, fin.offering_70 || 0, fin.offering_30 || 0,
      fin.wednesday_offering_70 || 0, fin.wednesday_offering_30 || 0,
      fin.gospel_service_offering_70 || 0, fin.gospel_service_offering_30 || 0,
      totalRemitted,
      status === 'submitted' ? new Date() : null,
    ]);

    const report = reportResult.rows[0];

    // Replace attendance rows
    await client.query('DELETE FROM attendance_rows WHERE report_id = $1', [report.id]);
    for (const row of attendanceRows) {
      if (!row.date) continue;
      const total = (parseInt(row.attendance_men)||0) + (parseInt(row.attendance_women)||0) + (parseInt(row.attendance_children)||0);
      await client.query(`
        INSERT INTO attendance_rows (report_id, date, day_name, attendance_men, attendance_women, attendance_children,
          attendance_total, preacher_minister, new_convert, new_guest, sunday_school_attendance, house_fellowship, monetary_amount)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      `, [
        report.id, row.date, row.day_name, row.attendance_men||0, row.attendance_women||0,
        row.attendance_children||0, total, row.preacher_minister||'', row.new_convert||0,
        row.new_guest||0, row.sunday_school_attendance||0, row.house_fellowship||0, row.monetary_amount||0,
      ]);
    }

    await client.query('COMMIT');

    // If submitted, notify admins
    if (status === 'submitted') {
      const admins = await pool.query("SELECT * FROM users WHERE role IN ('admin','head_admin') AND status = 'active'");
      for (const admin of admins.rows) {
        const { subject, html } = emailTemplates.reportSubmitted(admin, report);
        await sendEmail({ to: admin.email, subject, html });
        await createNotification(admin.id, 'New Report Submitted', `${branch} submitted ${month} ${year} report.`, 'info', '/admin/reports');
      }
      await auditLog(req.user.id, 'REPORT_SUBMITTED', 'report', report.id, { branch, month, year }, req);
    } else {
      await auditLog(req.user.id, 'REPORT_SAVED_DRAFT', 'report', report.id, { branch, month, year }, req);
    }

    res.status(201).json(report);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to save report' });
  } finally {
    client.release();
  }
});

// POST /api/reports/:id/approve
router.post('/:id/approve', requireAdmin, async (req, res) => {
  const { comment } = req.body;
  try {
    const rep = await pool.query('SELECT * FROM monthly_reports WHERE id = $1', [req.params.id]);
    if (!rep.rows.length) return res.status(404).json({ error: 'Report not found' });
    if (rep.rows[0].status !== 'submitted') return res.status(400).json({ error: 'Report is not in submitted state' });

    await pool.query(`
      UPDATE monthly_reports SET status = 'approved', reviewed_by = $1, reviewed_at = NOW(), admin_comment = $2, updated_at = NOW()
      WHERE id = $3
    `, [req.user.id, comment || null, req.params.id]);

    const user = await pool.query('SELECT * FROM users WHERE id = $1', [rep.rows[0].user_id]);
    const report = { ...rep.rows[0], admin_comment: comment };
    const { subject, html } = emailTemplates.reportApproved(user.rows[0], report);
    await sendEmail({ to: user.rows[0].email, subject, html });
    await createNotification(user.rows[0].id, 'Report Approved', `Your ${report.month} ${report.year} report has been approved.`, 'success');
    await auditLog(req.user.id, 'REPORT_APPROVED', 'report', req.params.id, { comment }, req);

    res.json({ message: 'Report approved' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to approve' });
  }
});

// POST /api/reports/:id/reject
router.post('/:id/reject', requireAdmin, async (req, res) => {
  const { reason } = req.body;
  if (!reason) return res.status(400).json({ error: 'Rejection reason required' });

  try {
    const rep = await pool.query('SELECT * FROM monthly_reports WHERE id = $1', [req.params.id]);
    if (!rep.rows.length) return res.status(404).json({ error: 'Report not found' });

    await pool.query(`
      UPDATE monthly_reports SET status = 'rejected', reviewed_by = $1, reviewed_at = NOW(), rejection_reason = $2, updated_at = NOW()
      WHERE id = $3
    `, [req.user.id, reason, req.params.id]);

    const user = await pool.query('SELECT * FROM users WHERE id = $1', [rep.rows[0].user_id]);
    const report = { ...rep.rows[0], rejection_reason: reason };
    const { subject, html } = emailTemplates.reportRejected(user.rows[0], report);
    await sendEmail({ to: user.rows[0].email, subject, html });
    await createNotification(user.rows[0].id, 'Report Needs Revision', `Your ${report.month} ${report.year} report needs revision.`, 'error');
    await auditLog(req.user.id, 'REPORT_REJECTED', 'report', req.params.id, { reason }, req);

    res.json({ message: 'Report rejected' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to reject' });
  }
});

module.exports = router;
