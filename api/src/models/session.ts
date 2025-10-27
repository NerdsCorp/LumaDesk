import { Pool } from 'pg';

export interface Session {
  id: string;
  user_id: string;
  device_id: string;
  device_hostname?: string;
  device_mac?: string;
  device_ip?: string;
  session_token: string;
  status: 'active' | 'inactive' | 'terminated';
  started_at: Date;
  last_heartbeat: Date;
  ended_at?: Date;
}

export interface CreateSessionInput {
  user_id: string;
  device_id: string;
  device_hostname?: string;
  device_mac?: string;
  device_ip?: string;
  session_token: string;
}

export class SessionModel {
  constructor(private db: Pool) {}

  async create(input: CreateSessionInput): Promise<Session> {
    const result = await this.db.query(
      `INSERT INTO sessions (user_id, device_id, device_hostname, device_mac, device_ip, session_token, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'active')
       RETURNING *`,
      [
        input.user_id,
        input.device_id,
        input.device_hostname,
        input.device_mac,
        input.device_ip,
        input.session_token,
      ]
    );
    return result.rows[0];
  }

  async findById(id: string): Promise<Session | null> {
    const result = await this.db.query(
      'SELECT * FROM sessions WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  async findByToken(token: string): Promise<Session | null> {
    const result = await this.db.query(
      'SELECT * FROM sessions WHERE session_token = $1',
      [token]
    );
    return result.rows[0] || null;
  }

  async findActiveByDeviceId(deviceId: string): Promise<Session | null> {
    const result = await this.db.query(
      `SELECT * FROM sessions
       WHERE device_id = $1 AND status = 'active'
       ORDER BY started_at DESC
       LIMIT 1`,
      [deviceId]
    );
    return result.rows[0] || null;
  }

  async listActive(): Promise<Session[]> {
    const result = await this.db.query(
      `SELECT s.*, u.username, u.email
       FROM sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.status = 'active'
       ORDER BY s.started_at DESC`
    );
    return result.rows;
  }

  async listByUserId(userId: string): Promise<Session[]> {
    const result = await this.db.query(
      'SELECT * FROM sessions WHERE user_id = $1 ORDER BY started_at DESC',
      [userId]
    );
    return result.rows;
  }

  async updateHeartbeat(id: string): Promise<void> {
    await this.db.query(
      'UPDATE sessions SET last_heartbeat = NOW() WHERE id = $1',
      [id]
    );
  }

  async terminate(id: string): Promise<boolean> {
    const result = await this.db.query(
      `UPDATE sessions
       SET status = 'terminated', ended_at = NOW()
       WHERE id = $1 AND status = 'active'`,
      [id]
    );
    return (result.rowCount || 0) > 0;
  }

  async terminateByDeviceId(deviceId: string): Promise<boolean> {
    const result = await this.db.query(
      `UPDATE sessions
       SET status = 'terminated', ended_at = NOW()
       WHERE device_id = $1 AND status = 'active'`,
      [deviceId]
    );
    return (result.rowCount || 0) > 0;
  }

  async cleanupStale(timeoutMinutes: number = 15): Promise<number> {
    const result = await this.db.query(
      `UPDATE sessions
       SET status = 'inactive', ended_at = NOW()
       WHERE status = 'active'
       AND last_heartbeat < NOW() - INTERVAL '${timeoutMinutes} minutes'`
    );
    return result.rowCount || 0;
  }
}
