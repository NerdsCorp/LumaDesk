import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getDatabase } from '../utils/database';
import { DeviceModel } from '../models/device';
import { SessionModel } from '../models/session';
import { AuditLogModel } from '../models/auditLog';
import { requireAdmin } from '../middleware/auth';
import { generatePairingToken } from '../utils/auth';

const registerDeviceSchema = z.object({
  device_id: z.string().min(1),
  hostname: z.string().optional(),
  mac_address: z.string().optional(),
  ip_address: z.string().optional(),
});

export async function deviceRoutes(fastify: FastifyInstance) {
  const db = getDatabase();
  const deviceModel = new DeviceModel(db);
  const sessionModel = new SessionModel(db);
  const auditLogModel = new AuditLogModel(db);

  // List all devices
  fastify.get('/', {
    onRequest: [requireAdmin],
  }, async () => {
    const devices = await deviceModel.list();
    return { devices };
  });

  // Get device by ID
  fastify.get('/:id', {
    onRequest: [requireAdmin],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const device = await deviceModel.findByDeviceId(id);

    if (!device) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Device not found',
      });
    }

    return device;
  });

  // Register device
  fastify.post('/register', async (request, reply) => {
    const body = registerDeviceSchema.parse(request.body);

    const device = await deviceModel.register(body);

    return reply.status(201).send(device);
  });

  // Generate pairing token for device
  fastify.post('/:id/pair', {
    onRequest: [requireAdmin],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const currentUser = request.user as any;

    const device = await deviceModel.findByDeviceId(id);
    if (!device) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Device not found',
      });
    }

    const pairingToken = generatePairingToken();
    await deviceModel.setPairingToken(id, pairingToken);

    await auditLogModel.create({
      user_id: currentUser.id,
      action: 'pair_device',
      resource_type: 'device',
      resource_id: device.id,
      details: {
        device_id: id,
      },
      ip_address: request.ip,
      user_agent: request.headers['user-agent'],
    });

    return {
      device_id: id,
      pairing_token: pairingToken,
    };
  });

  // Verify pairing token
  fastify.post('/:id/verify-pairing', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { pairing_token } = request.body as { pairing_token: string };

    if (!pairing_token) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Pairing token is required',
      });
    }

    const isValid = await deviceModel.verifyPairingToken(id, pairing_token);

    return { valid: isValid };
  });

  // Deprovision device (revoke access)
  fastify.post('/:id/deprovision', {
    onRequest: [requireAdmin],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const currentUser = request.user as any;

    const device = await deviceModel.findByDeviceId(id);
    if (!device) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Device not found',
      });
    }

    // Terminate any active sessions
    await sessionModel.terminateByDeviceId(id);

    // Deprovision device
    await deviceModel.deprovision(id);

    await auditLogModel.create({
      user_id: currentUser.id,
      action: 'deprovision_device',
      resource_type: 'device',
      resource_id: device.id,
      details: {
        device_id: id,
      },
      ip_address: request.ip,
      user_agent: request.headers['user-agent'],
    });

    return { success: true };
  });

  // Delete device
  fastify.delete('/:id', {
    onRequest: [requireAdmin],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const currentUser = request.user as any;

    const device = await deviceModel.findByDeviceId(id);
    if (!device) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Device not found',
      });
    }

    // Terminate any active sessions
    await sessionModel.terminateByDeviceId(id);

    // Delete device
    await deviceModel.delete(id);

    await auditLogModel.create({
      user_id: currentUser.id,
      action: 'delete_device',
      resource_type: 'device',
      resource_id: device.id,
      details: {
        device_id: id,
      },
      ip_address: request.ip,
      user_agent: request.headers['user-agent'],
    });

    return { success: true };
  });
}
