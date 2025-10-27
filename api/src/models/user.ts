import { Pool } from 'pg';
import { hashPassword, verifyPassword } from '../utils/auth';

export interface User {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  role: 'admin' | 'user';
  allowed_devices?: string[];
  created_at: Date;
  updated_at: Date;
}

export interface CreateUserInput {
  username: string;
  email: string;
  password: string;
  role?: 'admin' | 'user';
  allowed_devices?: string[];
}

export interface UpdateUserInput {
  email?: string;
  password?: string;
  role?: 'admin' | 'user';
  allowed_devices?: string[];
}

export class UserModel {
  constructor(private db: Pool) {}

  async create(input: CreateUserInput): Promise<Omit<User, 'password_hash'>> {
    const passwordHash = await hashPassword(input.password);
    const result = await this.db.query(
      `INSERT INTO users (username, email, password_hash, role, allowed_devices)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, username, email, role, allowed_devices, created_at, updated_at`,
      [
        input.username,
        input.email,
        passwordHash,
        input.role || 'user',
        input.allowed_devices || null,
      ]
    );
    return result.rows[0];
  }

  async findById(id: string): Promise<User | null> {
    const result = await this.db.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  async findByUsername(username: string): Promise<User | null> {
    const result = await this.db.query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );
    return result.rows[0] || null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const result = await this.db.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0] || null;
  }

  async list(): Promise<Omit<User, 'password_hash'>[]> {
    const result = await this.db.query(
      'SELECT id, username, email, role, allowed_devices, created_at, updated_at FROM users ORDER BY created_at DESC'
    );
    return result.rows;
  }

  async update(id: string, input: UpdateUserInput): Promise<Omit<User, 'password_hash'> | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (input.email !== undefined) {
      updates.push(`email = $${paramCount++}`);
      values.push(input.email);
    }

    if (input.password !== undefined) {
      const passwordHash = await hashPassword(input.password);
      updates.push(`password_hash = $${paramCount++}`);
      values.push(passwordHash);
    }

    if (input.role !== undefined) {
      updates.push(`role = $${paramCount++}`);
      values.push(input.role);
    }

    if (input.allowed_devices !== undefined) {
      updates.push(`allowed_devices = $${paramCount++}`);
      values.push(input.allowed_devices);
    }

    if (updates.length === 0) {
      return this.findById(id) as Promise<Omit<User, 'password_hash'>>;
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const result = await this.db.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount}
       RETURNING id, username, email, role, allowed_devices, created_at, updated_at`,
      values
    );

    return result.rows[0] || null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db.query(
      'DELETE FROM users WHERE id = $1',
      [id]
    );
    return (result.rowCount || 0) > 0;
  }

  async verifyPassword(username: string, password: string): Promise<User | null> {
    const user = await this.findByUsername(username);
    if (!user) {
      return null;
    }

    const isValid = await verifyPassword(password, user.password_hash);
    return isValid ? user : null;
  }
}
