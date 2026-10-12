import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { z } from 'zod';
import {
  connectDatabase,
  DeliveryModel,
  UserModel,
  OrderModel,
  getDbStatus,
} from '@quickcommerce/database';
import {
  createLogger,
  errorHandler,
  NotFoundError,
  BadRequestError,
  getEventBroker,
  authenticateToken,
  requireRoles,
  validateBody,
} from '@quickcommerce/shared-utils';
import {
  EventTopics,
  DeliveryAssignmentRequestedPayload,
} from '@quickcommerce/event-schemas';
import { ApiResponse, IDelivery, DeliveryStatus } from '@quickcommerce/shared-types';

dotenv.config({ path: '../../.env' });

const app = express();
const PORT = process.env.PORT_DELIVERY_SERVICE ? parseInt(process.env.PORT_DELIVERY_SERVICE, 10) : 4006;
const logger = createLogger('DeliveryService');
const broker = getEventBroker('DeliveryService');

app.use(cors());
app.use(express.json());

const startTime = Date.now();

// Health Endpoint
app.get('/health', (_req: Request, res: Response) => {
  const db = getDbStatus();
  res.json({
    service: 'delivery-service',
    port: PORT,
    status: db.isConnected ? 'UP' : 'DEGRADED',
    uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
    database: db,
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// Format Delivery DTO
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatDeliveryDto(d: any): IDelivery {
  return {
    id: d._id.toString(),
    orderId: d.orderId.toString(),
    partnerId: d.partnerId ? d.partnerId._id ? d.partnerId._id.toString() : d.partnerId.toString() : undefined,
    partnerName: d.partnerName || (d.partnerId && d.partnerId.name ? d.partnerId.name : undefined),
    partnerPhone: d.partnerPhone || (d.partnerId && d.partnerId.phone ? d.partnerId.phone : undefined),
    status: d.status,
    estimatedDeliveryMinutes: d.estimatedDeliveryMinutes,
    assignedAt: d.assignedAt ? d.assignedAt.toISOString() : undefined,
    deliveredAt: d.deliveredAt ? d.deliveredAt.toISOString() : undefined,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  };
}

// GET /api/v1/orders/:orderId/delivery-status
app.get('/api/v1/orders/:orderId/delivery-status', authenticateToken, async (req: Request, res: Response, next) => {
  try {
    const { orderId } = req.params;
    const delivery = await DeliveryModel.findOne({ orderId }).populate('partnerId', 'name phone email');
    if (!delivery) {
      throw new NotFoundError('Delivery tracking not found for this order');
    }

    res.json({
      success: true,
      message: 'Delivery status retrieved',
      data: formatDeliveryDto(delivery),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/delivery/assignments - List assignments
app.get(
  '/api/v1/delivery/assignments',
  authenticateToken,
  requireRoles('DELIVERY_PARTNER', 'ADMIN'),
  async (req: Request, res: Response, next) => {
    try {
      const user = req.user!;
      const filter: Record<string, unknown> = {};

      if (user.role === 'DELIVERY_PARTNER') {
        filter.$or = [
          { partnerId: new mongoose.Types.ObjectId(user.userId) },
          { status: 'PENDING' },
        ];
      }

      const deliveries = await DeliveryModel.find(filter)
        .populate('partnerId', 'name phone')
        .populate('orderId')
        .sort({ createdAt: -1 })
        .limit(50);

      res.json({
        success: true,
        message: 'Delivery assignments retrieved',
        data: deliveries.map(formatDeliveryDto),
      });
    } catch (err) {
      next(err);
    }
  }
);

// Update Status Schema
const updateStatusSchema = z.object({
  status: z.enum([
    'PENDING',
    'ASSIGNED',
    'ACCEPTED',
    'PICKED_UP',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'CANCELLED',
  ] as const),
});

// PATCH /api/v1/delivery/assignments/:id/status
app.patch(
  '/api/v1/delivery/assignments/:id/status',
  authenticateToken,
  requireRoles('DELIVERY_PARTNER', 'ADMIN'),
  validateBody(updateStatusSchema),
  async (req: Request, res: Response, next) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const user = req.user!;

      const delivery = await DeliveryModel.findById(id).populate('partnerId', 'name phone');
      if (!delivery) {
        throw new NotFoundError('Delivery record not found');
      }

      const prevStatus = delivery.status;
      delivery.status = status as DeliveryStatus;

      // Assign partner if partner accepts an unassigned order
      if (status === 'ACCEPTED' && !delivery.partnerId && user.role === 'DELIVERY_PARTNER') {
        delivery.partnerId = new mongoose.Types.ObjectId(user.userId);
        delivery.partnerName = user.name;
        delivery.assignedAt = new Date();
      }

      if (status === 'DELIVERED') {
        delivery.deliveredAt = new Date();
      }

      await delivery.save();

      // Publish status updated event
      await broker.publish(EventTopics.DELIVERY_STATUS_UPDATED, {
        orderId: delivery.orderId.toString(),
        deliveryId: delivery._id.toString(),
        previousStatus: prevStatus,
        currentStatus: delivery.status,
        updatedAt: new Date().toISOString(),
      });

      logger.info(`Delivery ${id} transitioned from ${prevStatus} -> ${status}`);

      res.json({
        success: true,
        message: `Delivery status updated to ${status}`,
        data: formatDeliveryDto(delivery),
      });
    } catch (err) {
      next(err);
    }
  }
);

// Automatic Partner Assignment Workflow
async function assignPartnerToOrder(orderId: string): Promise<void> {
  try {
    // Check if delivery record already exists
    let delivery = await DeliveryModel.findOne({ orderId });
    if (delivery && delivery.partnerId) {
      return;
    }

    // Find a delivery partner
    const partner = await UserModel.findOne({ role: 'DELIVERY_PARTNER' });

    if (!delivery) {
      delivery = new DeliveryModel({
        orderId: new mongoose.Types.ObjectId(orderId),
        status: partner ? 'ASSIGNED' : 'PENDING',
        partnerId: partner ? partner._id : undefined,
        partnerName: partner ? partner.name : 'QuickRider Fleet',
        partnerPhone: partner ? partner.phone || '+91 98765 43210' : '+91 98765 43210',
        estimatedDeliveryMinutes: 12,
        assignedAt: partner ? new Date() : undefined,
      });
    } else if (partner) {
      delivery.partnerId = partner._id;
      delivery.partnerName = partner.name;
      delivery.partnerPhone = partner.phone || '+91 98765 43210';
      delivery.status = 'ASSIGNED';
      delivery.assignedAt = new Date();
    }

    await delivery.save();

    if (partner) {
      await broker.publish(EventTopics.DELIVERY_ASSIGNED, {
        orderId,
        deliveryId: delivery._id.toString(),
        partnerId: partner._id.toString(),
        partnerName: partner.name,
        partnerPhone: partner.phone || '+91 98765 43210',
        estimatedMinutes: 12,
      });
      logger.info(`Assigned delivery partner ${partner.name} to order ${orderId}`);
    }
  } catch (err) {
    logger.error(`Error in assignPartnerToOrder: ${(err as Error).message}`);
  }
}

// Event Subscription
const setupSubscriptions = async () => {
  await broker.subscribe<DeliveryAssignmentRequestedPayload>(
    'delivery.assignment.request.queue',
    EventTopics.DELIVERY_ASSIGNMENT_REQUESTED,
    async (event) => {
      logger.info(`Received delivery assignment request for order ${event.payload.orderId}`);
      await assignPartnerToOrder(event.payload.orderId);
    }
  );
};

const start = async () => {
  try {
    await connectDatabase();
    logger.info('Connected to MongoDB');
    await setupSubscriptions();
    app.listen(PORT, () => {
      logger.info(`DeliveryService running on port ${PORT}`);
    });
  } catch (err) {
    logger.error(`Failed to start DeliveryService: ${(err as Error).message}`);
    process.exit(1);
  }
};

if (process.env.NODE_ENV !== 'test') {
  start();
}

export { app, assignPartnerToOrder };
