const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendEmail = async ({ to, subject, html }) => {
  try {
    await transporter.sendMail({
      from: `"Gospel of Truth Mission" <${process.env.EMAIL_FROM}>`,
      to,
      subject,
      html,
    });
    console.log(`📧 Email sent to ${to}: ${subject}`);
  } catch (err) {
    console.error('Email error:', err.message);
  }
};

const emailTemplates = {
  adminRequestReceived: (user) => ({
    subject: 'Admin Request Received - GOTM Church System',
    html: `<div style="font-family:sans-serif;max-width:600px;margin:auto;">
      <h2 style="color:#185FA5;">Gospel of Truth Mission</h2>
      <p>Hello ${user.fullname},</p>
      <p>Your request for admin access has been received and is under review by the Head Administrator.</p>
      <p>You will be notified once a decision is made.</p>
      <br><p>God bless,<br>GOTM Church Management System</p>
    </div>`
  }),

  adminRequestNotifyHeadAdmin: (requester, reason) => ({
    subject: 'New Admin Access Request - Action Required',
    html: `<div style="font-family:sans-serif;max-width:600px;margin:auto;">
      <h2 style="color:#185FA5;">New Admin Request</h2>
      <p>A user has requested admin access:</p>
      <table style="border-collapse:collapse;width:100%;">
        <tr><td style="padding:8px;border:1px solid #ddd;"><strong>Name</strong></td><td style="padding:8px;border:1px solid #ddd;">${requester.fullname}</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd;"><strong>Email</strong></td><td style="padding:8px;border:1px solid #ddd;">${requester.email}</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd;"><strong>Branch</strong></td><td style="padding:8px;border:1px solid #ddd;">${requester.branch_name || 'N/A'}</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd;"><strong>Reason</strong></td><td style="padding:8px;border:1px solid #ddd;">${reason}</td></tr>
      </table>
      <p><a href="${process.env.FRONTEND_URL}/admin/requests" style="background:#185FA5;color:#fff;padding:10px 20px;text-decoration:none;border-radius:4px;display:inline-block;margin-top:16px;">Review Request</a></p>
    </div>`
  }),

  adminRequestApproved: (user) => ({
    subject: 'Admin Access Approved - GOTM Church System',
    html: `<div style="font-family:sans-serif;max-width:600px;margin:auto;">
      <h2 style="color:#3B6D11;">Access Approved ✓</h2>
      <p>Hello ${user.fullname},</p>
      <p>Your admin access request has been <strong>approved</strong> by the Head Administrator.</p>
      <p>You now have admin privileges and can manage branch reports.</p>
      <p><a href="${process.env.FRONTEND_URL}/login" style="background:#185FA5;color:#fff;padding:10px 20px;text-decoration:none;border-radius:4px;display:inline-block;margin-top:16px;">Login Now</a></p>
    </div>`
  }),

  adminRequestRejected: (user, reason) => ({
    subject: 'Admin Access Request Update - GOTM Church System',
    html: `<div style="font-family:sans-serif;max-width:600px;margin:auto;">
      <h2 style="color:#A32D2D;">Request Not Approved</h2>
      <p>Hello ${user.fullname},</p>
      <p>Your request for admin access was not approved at this time.</p>
      ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
      <p>You may contact the Head Administrator for more information.</p>
    </div>`
  }),

  reportSubmitted: (admin, report) => ({
    subject: `New Report Submitted - ${report.branch} (${report.month} ${report.year})`,
    html: `<div style="font-family:sans-serif;max-width:600px;margin:auto;">
      <h2 style="color:#185FA5;">New Report Submitted</h2>
      <p>Hello ${admin.fullname},</p>
      <p>A new monthly report has been submitted and requires your review:</p>
      <table style="border-collapse:collapse;width:100%;">
        <tr><td style="padding:8px;border:1px solid #ddd;"><strong>Branch</strong></td><td style="padding:8px;border:1px solid #ddd;">${report.branch}</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd;"><strong>Period</strong></td><td style="padding:8px;border:1px solid #ddd;">${report.month} ${report.year}</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd;"><strong>Division</strong></td><td style="padding:8px;border:1px solid #ddd;">${report.division}</td></tr>
      </table>
      <p><a href="${process.env.FRONTEND_URL}/admin/reports" style="background:#185FA5;color:#fff;padding:10px 20px;text-decoration:none;border-radius:4px;display:inline-block;margin-top:16px;">Review Report</a></p>
    </div>`
  }),

  reportApproved: (user, report) => ({
    subject: `Report Approved - ${report.month} ${report.year}`,
    html: `<div style="font-family:sans-serif;max-width:600px;margin:auto;">
      <h2 style="color:#3B6D11;">Report Approved ✓</h2>
      <p>Hello ${user.fullname},</p>
      <p>Your monthly report for <strong>${report.branch}</strong> (${report.month} ${report.year}) has been <strong>approved</strong>.</p>
      ${report.admin_comment ? `<p><strong>Admin comment:</strong> ${report.admin_comment}</p>` : ''}
    </div>`
  }),

  reportRejected: (user, report) => ({
    subject: `Report Needs Revision - ${report.month} ${report.year}`,
    html: `<div style="font-family:sans-serif;max-width:600px;margin:auto;">
      <h2 style="color:#A32D2D;">Report Needs Revision</h2>
      <p>Hello ${user.fullname},</p>
      <p>Your monthly report for <strong>${report.branch}</strong> (${report.month} ${report.year}) has been returned for revision.</p>
      ${report.rejection_reason ? `<p><strong>Reason:</strong> ${report.rejection_reason}</p>` : ''}
      <p>Please login, make corrections and resubmit.</p>
    </div>`
  }),
};

module.exports = { sendEmail, emailTemplates };
