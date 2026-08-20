const bcrypt = require('bcryptjs');
const { pool } = require('./db');

async function seed() {
  const existing = await pool.query("SELECT id FROM users WHERE role = 'head_admin' LIMIT 1");
  if (existing.rows.length > 0) {
    console.log('Head admin already exists. Skipping seed.');
    return;
  }

  const email = process.env.HEAD_ADMIN_EMAIL;
  const password = process.env.HEAD_ADMIN_PASSWORD;
  const fullname = process.env.HEAD_ADMIN_FULLNAME || 'Head Administrator';

  if (!email || !password) {
    console.log('HEAD_ADMIN_EMAIL and HEAD_ADMIN_PASSWORD env vars required for seeding. Skipping.');
    return;
  }

  const hash = await bcrypt.hash(password, 12);
  await pool.query(`
    INSERT INTO users (fullname, email, password_hash, role, status, branch_name, division)
    VALUES ($1, $2, $3, 'head_admin', 'active', 'Headquarters', 'All Divisions')
  `, [fullname, email, hash]);

  console.log(`Head Admin created: ${email}`);
}

// Allow running standalone: node src/models/seed.js
if (require.main === module) {
  require('dotenv').config();
  seed().catch(console.error).finally(() => process.exit());
}

module.exports = { seed };
