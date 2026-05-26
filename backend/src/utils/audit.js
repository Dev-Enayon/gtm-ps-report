const { pool } = require('../models/db');

const auditLog = async (userId, action, entityType = null, entityId = null, details = {}, req = null) => {
  try {
    await pool.query(`
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      userId,
      action,
      entityType,
      entityId,
      JSON.stringify(details),
      req?.ip || null,
      req?.headers?.['user-agent'] || null,
    ]);
  } catch (err) {
    console.error('Audit log error:', err.message);
  }
};

const createNotification = async (userId, title, message, type = 'info', link = null) => {
  try {
    await pool.query(`
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES ($1, $2, $3, $4, $5)
    `, [userId, title, message, type, link]);
  } catch (err) {
    console.error('Notification error:', err.message);
  }
};

module.exports = { auditLog, createNotification };
