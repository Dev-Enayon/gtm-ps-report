const { pool } = require('./db');

const TABLES = [
  `CREATE TABLE IF NOT EXISTS users (
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
  )`,
  `CREATE TABLE IF NOT EXISTS admin_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    requested_role VARCHAR(20) NOT NULL DEFAULT 'admin',
    reason TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    review_note TEXT,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS monthly_reports (
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
  )`,
  `CREATE TABLE IF NOT EXISTS attendance_rows (
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
  )`,
  `CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    details JSONB,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info',
    is_read BOOLEAN DEFAULT FALSE,
    link TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
];

const INDEXES = [
  'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
  'CREATE INDEX IF NOT EXISTS idx_reports_user_id ON monthly_reports(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_reports_status ON monthly_reports(status)',
  'CREATE INDEX IF NOT EXISTS idx_reports_month_year ON monthly_reports(month, year)',
  'CREATE INDEX IF NOT EXISTS idx_attendance_report_id ON attendance_rows(report_id)',
  'CREATE INDEX IF NOT EXISTS idx_audit_user_id ON audit_logs(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_admin_requests_user_id ON admin_requests(user_id)',
];

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Running migrations...');

    for (const sql of TABLES) {
      await client.query(sql);
    }

    for (const sql of INDEXES) {
      await client.query(sql);
    }

    console.log('Migrations complete');
  } finally {
    client.release();
  }
}

if (require.main === module) {
  require('dotenv').config();
  migrate().catch(console.error).finally(() => process.exit());
}

module.exports = { migrate };
