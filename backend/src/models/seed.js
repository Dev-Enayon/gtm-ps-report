require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('./db');

async function seed() {
  const client = await pool.connect();
  try {
    // Check if head admin exists
    const existing = await client.query(
      "SELECT id FROM users WHERE role = 'head_admin' LIMIT 1"
    );
    if (existing.rows.length > 0) {
      console.log('ℹ️  Head admin already exists. Skipping seed.');
      return;
    }

    const email = process.env.HEAD_ADMIN_EMAIL || 'headadmin@gotm.org';
    const password = process.env.HEAD_ADMIN_PASSWORD || 'Admin@2024!';
    const fullname = process.env.HEAD_ADMIN_FULLNAME || 'Head Administrator';

    const hash = await bcrypt.hash(password, 12);

    await client.query(`
      INSERT INTO users (fullname, email, password_hash, role, status, branch_name, division)
      VALUES ($1, $2, $3, 'head_admin', 'active', 'Headquarters', 'All Divisions')
    `, [fullname, email, hash]);

    console.log('✅ Head Admin created successfully!');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log('   ⚠️  Please change the password after first login!');
  } catch (err) {
    console.error('❌ Seed failed:', err);
    throw err;
  } finally {
    client.release();
  }
}

seed().catch(console.error).finally(() => process.exit());
