import { Pool } from 'pg';
import { logger } from './logger';
import { runMigrations } from '../migrations/run';

let pool: Pool | null = null;

export function getDatabase(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    pool.on('error', (err) => {
      logger.error({ err }, 'Unexpected database error');
    });
  }

  return pool;
}

export async function initDatabase(): Promise<void> {
  const db = getDatabase();

  try {
    // Test connection
    const client = await db.connect();
    await client.query('SELECT NOW()');
    client.release();
    logger.info('Database connection established');

    // Run migrations
    await runMigrations(db);
    logger.info('Database migrations completed');
  } catch (err) {
    logger.error({ err }, 'Failed to initialize database');
    throw err;
  }
}

export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info('Database connection closed');
  }
}
