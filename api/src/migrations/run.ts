import { Pool } from 'pg';
import { logger } from '../utils/logger';
import { hashPassword } from '../utils/auth';

interface Migration {
  id: number;
  name: string;
  up: (db: Pool) => Promise<void>;
}

const migrations: Migration[] = [
  {
    id: 1,
    name: 'create_initial_schema',
    up: async (db: Pool) => {
      await db.query(`
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          username VARCHAR(255) UNIQUE NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          role VARCHAR(50) NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
          allowed_devices TEXT[],
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE INDEX idx_users_username ON users(username);
        CREATE INDEX idx_users_email ON users(email);
      `);

      await db.query(`
        CREATE TABLE IF NOT EXISTS devices (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          device_id VARCHAR(255) UNIQUE NOT NULL,
          hostname VARCHAR(255),
          mac_address VARCHAR(17),
          ip_address VARCHAR(45),
          pairing_token VARCHAR(255),
          paired_at TIMESTAMP WITH TIME ZONE,
          last_seen TIMESTAMP WITH TIME ZONE,
          status VARCHAR(50) NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'deprovisioned')),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE INDEX idx_devices_device_id ON devices(device_id);
        CREATE INDEX idx_devices_status ON devices(status);
      `);

      await db.query(`
        CREATE TABLE IF NOT EXISTS sessions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          device_id VARCHAR(255) NOT NULL,
          device_hostname VARCHAR(255),
          device_mac VARCHAR(17),
          device_ip VARCHAR(45),
          session_token VARCHAR(255) UNIQUE NOT NULL,
          status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'terminated')),
          started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          last_heartbeat TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          ended_at TIMESTAMP WITH TIME ZONE
        );

        CREATE INDEX idx_sessions_user_id ON sessions(user_id);
        CREATE INDEX idx_sessions_device_id ON sessions(device_id);
        CREATE INDEX idx_sessions_token ON sessions(session_token);
        CREATE INDEX idx_sessions_status ON sessions(status);
      `);

      await db.query(`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES users(id) ON DELETE SET NULL,
          action VARCHAR(255) NOT NULL,
          resource_type VARCHAR(100) NOT NULL,
          resource_id VARCHAR(255),
          details JSONB,
          ip_address VARCHAR(45),
          user_agent TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
        CREATE INDEX idx_audit_logs_resource_type ON audit_logs(resource_type);
        CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
      `);

      await db.query(`
        CREATE TABLE IF NOT EXISTS migrations (
          id INTEGER PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);

      logger.info('Initial schema created');
    },
  },
  {
    id: 2,
    name: 'create_admin_user',
    up: async (db: Pool) => {
      const username = process.env.ADMIN_USERNAME || 'admin';
      const email = process.env.ADMIN_EMAIL || 'admin@lumadesk.local';
      const password = process.env.ADMIN_PASSWORD || 'admin';

      // Check if admin user already exists
      const existingUser = await db.query(
        'SELECT id FROM users WHERE username = $1',
        [username]
      );

      if (existingUser.rows.length === 0) {
        const passwordHash = await hashPassword(password);
        await db.query(
          `INSERT INTO users (username, email, password_hash, role)
           VALUES ($1, $2, $3, 'admin')`,
          [username, email, passwordHash]
        );
        logger.info(`Admin user created: ${username}`);
      } else {
        logger.info('Admin user already exists');
      }
    },
  },
];

export async function runMigrations(db: Pool): Promise<void> {
  try {
    // Create migrations table if it doesn't exist
    await db.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Get applied migrations
    const result = await db.query(
      'SELECT id FROM migrations ORDER BY id'
    );
    const appliedMigrations = new Set(result.rows.map((row) => row.id));

    // Run pending migrations
    for (const migration of migrations) {
      if (!appliedMigrations.has(migration.id)) {
        logger.info(`Running migration ${migration.id}: ${migration.name}`);
        await migration.up(db);
        await db.query(
          'INSERT INTO migrations (id, name) VALUES ($1, $2)',
          [migration.id, migration.name]
        );
        logger.info(`Migration ${migration.id} completed`);
      }
    }

    logger.info('All migrations completed');
  } catch (err) {
    logger.error({ err }, 'Migration failed');
    throw err;
  }
}
