require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const { pool } = require('./models/db');

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const reportRoutes = require('./routes/reports');

// ─── Auto-migrate + Auto-seed on startup ───────────────────────────────────
async function initDatabase() {
  const client = await pool.connect();
  try {
    console.log('🔧 Running database migrations...');

    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        fullname VARCHAR(200) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'branch' CHECK (role IN ('head_admin', 'admin', 'branch')),
        status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended')),
        branch_name VARCHAR(200),
        division VARCHAR(100),
        phone VARCHAR(30),
        avatar_url TEXT,
        admin_request_note TEXT,
        admin_approved_by UUID,
        admin_approved_at TIMESTAMPTZ,
        last_login TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        requested_role VARCHAR(20) NOT NULL DEFAULT 'admin',
        reason TEXT NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
        reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
        review_note TEXT,
        reviewed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS monthly_reports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        division VARCHAR(100) NOT NULL,
        branch VARCHAR(200) NOT NULL,
        month VARCHAR(20) NOT NULL,
        year INTEGER NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
        rejection_reason TEXT,
        admin_comment TEXT,
        reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
        reviewed_at TIMESTAMPTZ,
        submitted_at TIMESTAMPTZ,
        total_men INTEGER DEFAULT 0,
        total_women INTEGER DEFAULT 0,
        total_children INTEGER DEFAULT 0,
        total_attendance INTEGER DEFAULT 0,
        total_new_converts INTEGER DEFAULT 0,
        total_new_guests INTEGER DEFAULT 0,
        total_monetary NUMERIC(15,2) DEFAULT 0,
        workers_tithe_100 NUMERIC(15,2) DEFAULT 0,
        workers_tithe_70 NUMERIC(15,2) DEFAULT 0,
        members_tithe_100 NUMERIC(15,2) DEFAULT 0,
        members_tithe_70 NUMERIC(15,2) DEFAULT 0,
        welfare_offering_100 NUMERIC(15,2) DEFAULT 0,
        welfare_offering_90 NUMERIC(15,2) DEFAULT 0,
        welfare_offering_10 NUMERIC(15,2) DEFAULT 0,
        offering_100 NUMERIC(15,2) DEFAULT 0,
        offering_70 NUMERIC(15,2) DEFAULT 0,
        offering_30 NUMERIC(15,2) DEFAULT 0,
        wednesday_offering_70 NUMERIC(15,2) DEFAULT 0,
        wednesday_offering_30 NUMERIC(15,2) DEFAULT 0,
        gospel_service_offering_70 NUMERIC(15,2) DEFAULT 0,
        gospel_service_offering_30 NUMERIC(15,2) DEFAULT 0,
        total_amount_remitted NUMERIC(15,2) DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, month, year, branch)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS attendance_rows (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        report_id UUID NOT NULL REFERENCES monthly_reports(id) ON DELETE CASCADE,
        date INTEGER NOT NULL,
        day_name VARCHAR(10) NOT NULL,
        attendance_men INTEGER DEFAULT 0,
        attendance_women INTEGER DEFAULT 0,
        attendance_children INTEGER DEFAULT 0,
        attendance_total INTEGER DEFAULT 0,
        preacher_minister VARCHAR(200),
        new_convert INTEGER DEFAULT 0,
        new_guest INTEGER DEFAULT 0,
        sunday_school_attendance INTEGER DEFAULT 0,
        house_fellowship INTEGER DEFAULT 0,
        monetary_amount NUMERIC(12,2) DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50),
        entity_id UUID,
        details JSONB,
        ip_address VARCHAR(50),
        user_agent TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(200) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'info',
        is_read BOOLEAN DEFAULT FALSE,
        link TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Indexes (IF NOT EXISTS is safe to re-run)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_reports_user_id ON monthly_reports(user_id);
      CREATE INDEX IF NOT EXISTS idx_reports_status ON monthly_reports(status);
      CREATE INDEX IF NOT EXISTS idx_attendance_report_id ON attendance_rows(report_id);
      CREATE INDEX IF NOT EXISTS idx_audit_user_id ON audit_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
    `);

    await client.query('COMMIT');
    console.log('✅ Migrations complete');

    // ── Auto-seed Head Admin ──────────────────────────────────────────────
    const existing = await pool.query("SELECT id FROM users WHERE role = 'head_admin' LIMIT 1");
    if (existing.rows.length === 0) {
      const email    = process.env.HEAD_ADMIN_EMAIL    || 'headadmin@gotm.org';
      const password = process.env.HEAD_ADMIN_PASSWORD || 'Admin@2024!';
      const fullname = process.env.HEAD_ADMIN_FULLNAME || 'Head Administrator';
      const hash = await bcrypt.hash(password, 12);
      await pool.query(`
        INSERT INTO users (fullname, email, password_hash, role, status, branch_name, division)
        VALUES ($1, $2, $3, 'head_admin', 'active', 'Headquarters', 'All Divisions')
      `, [fullname, email, hash]);
      console.log(`✅ Head Admin created → ${email}`);
    } else {
      console.log('ℹ️  Head Admin already exists');
    }

  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('❌ Database init error:', err.message);
    // Don't crash the server — DB might already be set up
  } finally {
    client.release();
  }
}

const app = express();

// Security
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
}));

// Rate limiting
app.use('/api/auth', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Too many requests. Please try again later.' }
}));

// Logging & parsing
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Trust proxy (for Render/Railway/Heroku)
app.set('trust proxy', 1);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reports', reportRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'GOTM Church API', timestamp: new Date().toISOString() });
});

// 404
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;

// Init DB then start server
initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🚀 GOTM Church API running on port ${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   Frontend URL: ${process.env.FRONTEND_URL || 'not set'}\n`);
  });
}).catch((err) => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
