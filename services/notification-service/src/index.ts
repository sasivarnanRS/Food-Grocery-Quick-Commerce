import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { createLogger, errorHandler, getEventBroker, authenticateToken } from '@quickcommerce/shared-utils';
import {
  EventTopics,
  OrderConfirmedPayload,
  DeliveryAssignedPayload,
  DeliveryStatusUpdatedPayload,
  InventoryReservationFailedPayload,
} from '@quickcommerce/event-schemas';

dotenv.config({ path: '../../.env' });

const app = express();
const PORT = process.env.PORT_NOTIFICATION_SERVICE ? parseInt(process.env.PORT_NOTIFICATION_SERVICE, 10) : 4007;
const logger = createLogger('NotificationService');
const broker = getEventBroker('NotificationService');

app.use(cors());
app.use(express.json());

interface InAppNotification {
  id: string;
  recipientId: string;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ALERT';
  timestamp: string;
  read: boolean;
  metadata?: Record<string, unknown>;
}

const notifications: InAppNotification[] = [];
const startTime = Date.now();

// Health Check
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    service: 'notification-service',
    port: PORT,
    status: 'UP',
    uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
    totalNotificationsSent: notifications.length,
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// GET /api/v1/notifications
app.get('/api/v1/notifications', authenticateToken, (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const userRole = req.user!.role;

  // Filter notifications for this user or all if admin
  const userNotifs = notifications.filter(
    (n) => n.recipientId === userId || (userRole === 'ADMIN' && n.recipientId === 'ALL_ADMINS')
  );

  res.json({
    success: true,
    message: 'Notifications retrieved',
    data: userNotifs.slice(0, 30),
  });
});

const addNotification = (notif: Omit<InAppNotification, 'id' | 'timestamp' | 'read'>) => {
  const item: InAppNotification = {
    ...notif,
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    read: false,
  };
  notifications.unshift(item);
  if (notifications.length > 200) {
    notifications.pop();
  }
  logger.info(`Notification sent to ${notif.recipientId}: "${notif.title}"`);
};

// RabbitMQ Event Subscriptions
const setupSubscriptions = async () => {
  // Order Confirmed
  await broker.subscribe<OrderConfirmedPayload>(
    'notification.order.confirmed.queue',
    EventTopics.ORDER_CONFIRMED,
    async (event) => {
      const { order } = event.payload;
      addNotification({
        recipientId: order.userId,
        title: 'Order Confirmed! 🎉',
        message: `Your order #${order.id.slice(-6).toUpperCase()} for ₹${order.total} has been confirmed.`,
        type: 'SUCCESS',
        metadata: { orderId: order.id },
      });
    }
  );

  // Delivery Assigned
  await broker.subscribe<DeliveryAssignedPayload>(
    'notification.delivery.assigned.queue',
    EventTopics.DELIVERY_ASSIGNED,
    async (event) => {
      const { orderId, partnerName, estimatedMinutes } = event.payload;
      addNotification({
        recipientId: 'ALL_CUSTOMERS', // or specific order owner
        title: 'Delivery Partner Assigned 🛵',
        message: `${partnerName} is heading to the store. Arriving in ~${estimatedMinutes} mins!`,
        type: 'INFO',
        metadata: { orderId },
      });
    }
  );

  // Delivery Status Updated
  await broker.subscribe<DeliveryStatusUpdatedPayload>(
    'notification.delivery.status.queue',
    EventTopics.DELIVERY_STATUS_UPDATED,
    async (event) => {
      const { orderId, currentStatus } = event.payload;
      let title = 'Delivery Update';
      let message = `Order #${orderId.slice(-6).toUpperCase()} status changed to ${currentStatus}`;

      if (currentStatus === 'OUT_FOR_DELIVERY') {
        title = 'Out for Delivery 🚀';
        message = `Your order is out for delivery! Please be ready to receive it.`;
      } else if (currentStatus === 'DELIVERED') {
        title = 'Delivered! ✨';
        message = `Your order has been delivered. Thank you for shopping with QuickCommerce!`;
      }

      addNotification({
        recipientId: 'ALL_CUSTOMERS',
        title,
        message,
        type: currentStatus === 'DELIVERED' ? 'SUCCESS' : 'INFO',
        metadata: { orderId, currentStatus },
      });
    }
  );

  // Inventory Reservation Failed
  await broker.subscribe<InventoryReservationFailedPayload>(
    'notification.inventory.failed.queue',
    EventTopics.INVENTORY_RESERVATION_FAILED,
    async (event) => {
      addNotification({
        recipientId: 'ALL_ADMINS',
        title: 'Inventory Contention Alert ⚠️',
        message: `Reservation failed for store ${event.payload.storeId}: ${event.payload.reason}`,
        type: 'ALERT',
        metadata: event.payload as unknown as Record<string, unknown>,
      });
    }
  );
};

app.use(errorHandler);

const start = async () => {
  await setupSubscriptions();
  app.listen(PORT, () => {
    logger.info(`NotificationService running on port ${PORT}`);
  });
};

if (process.env.NODE_ENV !== 'test') {
  start();
}

export { app, notifications, addNotification };
