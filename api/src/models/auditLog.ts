import { Pool } from 'pg';

export interface AuditLog {
  id: string;
  user_id?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  details?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: Date;
}

export interface CreateAuditLogInput {
  user_id?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  details?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
}

export class AuditLogModel {
  constructor(private db: Pool) {}

  async create(input: CreateAuditLogInput): Promise<AuditLog> {
    const result = await this.db.query(
      `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        input.user_id,
        input.action,
        input.resource_type,
        input.resource_id,
        input.details ? JSON.stringify(input.details) : null,
        input.ip_address,
        input.user_agent,
      ]
    );
    return result.rows[0];
  }

  async list(limit: number = 100, offset: number = 0): Promise<AuditLog[]> {
    const result = await this.db.query(
      `SELECT a.*, u.username
       FROM audit_logs a
       LEFT JOIN users u ON a.user_id = u.id
       ORDER BY a.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return result.rows;
  }

  async listByUserId(userId: string, limit: number = 100): Promise<AuditLog[]> {
    const result = await this.db.query(
      `SELECT * FROM audit_logs
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, limit]
    );
    return result.rows;
  }

  async listByResourceType(resourceType: string, limit: number = 100): Promise<AuditLog[]> {
    const result = await this.db.query(
      `SELECT a.*, u.username
       FROM audit_logs a
       LEFT JOIN users u ON a.user_id = u.id
       WHERE a.resource_type = $1
       ORDER BY a.created_at DESC
       LIMIT $2`,
      [resourceType, limit]
    );
    return result.rows;
  }
}
