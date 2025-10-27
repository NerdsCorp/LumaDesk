import { Pool } from 'pg';

export interface Device {
  id: string;
  device_id: string;
  hostname?: string;
  mac_address?: string;
  ip_address?: string;
  pairing_token?: string;
  paired_at?: Date;
  last_seen?: Date;
  status: 'online' | 'offline' | 'deprovisioned';
  created_at: Date;
  updated_at: Date;
}

export interface RegisterDeviceInput {
  device_id: string;
  hostname?: string;
  mac_address?: string;
  ip_address?: string;
}

export class DeviceModel {
  constructor(private db: Pool) {}

  async register(input: RegisterDeviceInput): Promise<Device> {
    const result = await this.db.query(
      `INSERT INTO devices (device_id, hostname, mac_address, ip_address, status)
       VALUES ($1, $2, $3, $4, 'offline')
       ON CONFLICT (device_id) DO UPDATE
       SET hostname = EXCLUDED.hostname,
           mac_address = EXCLUDED.mac_address,
           ip_address = EXCLUDED.ip_address,
           last_seen = NOW(),
           updated_at = NOW()
       RETURNING *`,
      [input.device_id, input.hostname, input.mac_address, input.ip_address]
    );
    return result.rows[0];
  }

  async findById(id: string): Promise<Device | null> {
    const result = await this.db.query(
      'SELECT * FROM devices WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  async findByDeviceId(deviceId: string): Promise<Device | null> {
    const result = await this.db.query(
      'SELECT * FROM devices WHERE device_id = $1',
      [deviceId]
    );
    return result.rows[0] || null;
  }

  async list(): Promise<Device[]> {
    const result = await this.db.query(
      'SELECT * FROM devices ORDER BY last_seen DESC NULLS LAST'
    );
    return result.rows;
  }

  async updateStatus(deviceId: string, status: 'online' | 'offline'): Promise<void> {
    await this.db.query(
      'UPDATE devices SET status = $1, last_seen = NOW(), updated_at = NOW() WHERE device_id = $2',
      [status, deviceId]
    );
  }

  async setPairingToken(deviceId: string, token: string): Promise<void> {
    await this.db.query(
      'UPDATE devices SET pairing_token = $1, paired_at = NOW(), updated_at = NOW() WHERE device_id = $2',
      [token, deviceId]
    );
  }

  async verifyPairingToken(deviceId: string, token: string): Promise<boolean> {
    const result = await this.db.query(
      'SELECT pairing_token FROM devices WHERE device_id = $1',
      [deviceId]
    );

    if (!result.rows[0] || !result.rows[0].pairing_token) {
      return false;
    }

    return result.rows[0].pairing_token === token;
  }

  async deprovision(deviceId: string): Promise<boolean> {
    const result = await this.db.query(
      `UPDATE devices
       SET status = 'deprovisioned',
           pairing_token = NULL,
           updated_at = NOW()
       WHERE device_id = $1`,
      [deviceId]
    );
    return (result.rowCount || 0) > 0;
  }

  async delete(deviceId: string): Promise<boolean> {
    const result = await this.db.query(
      'DELETE FROM devices WHERE device_id = $1',
      [deviceId]
    );
    return (result.rowCount || 0) > 0;
  }
}
