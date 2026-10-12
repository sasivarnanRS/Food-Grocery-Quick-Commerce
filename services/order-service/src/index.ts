import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import {
  connectDatabase,
  OrderModel,
  CartModel,
  ProductModel,
  InventoryModel,
  StoreModel,
  OrderEventModel,
  getDbStatus,
} from '@quickcommerce/database';
import {
  createLogger,
  errorHandler,
  NotFoundError,
  BadRequestError,
  InsufficientStockError,
  ConflictError,
  getEventBroker,
  authenticateToken,
  validateBody,
} from '@quickcommerce/shared-utils';
import {
  EventTopics,
  DeliveryAssignedPayload,
  DeliveryStatusUpdatedPayload,
} from '@quickcommerce/event-schemas';
import { ApiResponse, IOrder, OrderStatus, PaymentMethod } from '@quickcommerce/shared-types';

dotenv.config({ path: '../../.env' });

const app = express();
const PORT = process.env.PORT_ORDER_SERVICE ? parseInt(process.env.PORT_ORDER_SERVICE, 10) : 4005;
const logger = createLogger('OrderService');
const broker = getEventBroker('OrderService');

app.use(cors());
app.use(express.json());

const startTime = Date.now();
let successfulOrders = 0;
let failedOrders = 0;

// Health Endpoint
app.get('/health', (_req: Request, res: Response) => {
  const db = getDbStatus();
  res.json({
    service: 'order-service',
    port: PORT,
    status: db.isConnected ? 'UP' : 'DEGRADED',
    uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
    database: db,
    successfulOrders,
    failedOrders,
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// Helper: Format Order DTO
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatOrderDto(order: any): IOrder {
  return {
    id: order._id.toString(),
    userId: order.userId.toString(),
    storeId: order.storeId.toString(),
    storeName: order.storeId.name || undefined,
    items: order.items.map((i: any) => ({
      productId: i.productId.toString(),
      name: i.name,
      image: i.image,
      unit: i.unit,
      quantity: i.quantity,
      price: i.price,
      discountPrice: i.discountPrice,
    })),
    subtotal: order.subtotal,
    discount: order.discount,
    deliveryFee: order.deliveryFee,
    tax: order.tax,
    total: order.total,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    orderStatus: order.orderStatus,
    idempotencyKey: order.idempotencyKey,
    deliveryAddress: order.deliveryAddress,
    timeline: order.timeline.map((t: any) => ({
      status: t.status,
      timestamp: t.timestamp.toISOString(),
      description: t.description,
    })),
    deliveryPartnerId: order.deliveryPartnerId ? order.deliveryPartnerId.toString() : undefined,
    deliveryPartnerName: order.deliveryPartnerName,
    estimatedDeliveryMinutes: order.estimatedDeliveryMinutes,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}

// Order Creation Schema
const createOrderSchema = z.object({
  idempotencyKey: z.string().min(1, 'Idempotency key is required'),
  storeId: z.string().min(1, 'Store ID is required'),
  deliveryAddress: z.object({
    street: z.string().min(3),
    city: z.string().min(2),
    pincode: z.string().min(4),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
  }),
  paymentMethod: z.enum(['COD', 'MOCK_ONLINE'] as const),
  items: z
    .array(
      z.object({
        productId: z.string(),
        quantity: z.number().int().positive(),
      })
    )
    .min(1, 'Order must contain at least one item')
    .optional(), // if omitted, uses user's active cart
});

// POST /api/v1/orders - Idempotent order placement with atomic reservation
app.post(
  '/api/v1/orders',
  authenticateToken,
  validateBody(createOrderSchema),
  async (req: Request, res: Response, next) => {
    const userId = req.user!.userId;
    const { idempotencyKey, storeId, deliveryAddress, paymentMethod } = req.body;
    let requestedItems = req.body.items;

    try {
      // 1. Idempotency Check: if key exists for this user, return previous order
      const existingOrder = await OrderModel.findOne({ userId, idempotencyKey });
      if (existingOrder) {
        logger.info(`Idempotent request received. Returning existing order ${existingOrder._id}`);
        const response: ApiResponse<IOrder> = {
          success: true,
          message: 'Order already processed (Idempotent response)',
          data: formatOrderDto(existingOrder),
          meta: { cached: true },
        };
        return res.status(200).json(response);
      }

      // 2. Fetch items from active Cart if not explicitly provided
      if (!requestedItems || requestedItems.length === 0) {
        const cart = await CartModel.findOne({ userId });
        if (!cart || cart.items.length === 0) {
          throw new BadRequestError('Cannot place order: Cart is empty');
        }
        requestedItems = cart.items.map((i: any) => ({
          productId: i.productId.toString(),
          quantity: i.quantity,
        }));
      }

      // 3. Verify Store exists
      const store = await StoreModel.findById(storeId);
      if (!store || !store.active) {
        throw new NotFoundError('Selected store is invalid or inactive');
      }

      // 4. Fetch products from trusted database (NEVER trust frontend pricing)
      const productIds = requestedItems.map((i: any) => i.productId);
      const products = await ProductModel.find({ _id: { $in: productIds }, active: true });
      if (products.length !== requestedItems.length) {
        throw new BadRequestError('One or more products in your order are unavailable');
      }

      const productMap = new Map(products.map((p) => [p._id.toString(), p]));
      let subtotal = 0;
      let discountTotal = 0;
      const orderItems = [];

      for (const reqItem of requestedItems) {
        const prod = productMap.get(reqItem.productId)!;
        const unitPrice = prod.price;
        const discountAmount = prod.discount ? (prod.price * prod.discount) / 100 : 0;
        const discountPrice = Number((unitPrice - discountAmount).toFixed(2));

        subtotal += unitPrice * reqItem.quantity;
        discountTotal += discountAmount * reqItem.quantity;

        orderItems.push({
          productId: prod._id,
          name: prod.name,
          image: prod.image,
          unit: prod.unit,
          quantity: reqItem.quantity,
          price: unitPrice,
          discountPrice,
        });
      }

      subtotal = Number(subtotal.toFixed(2));
      discountTotal = Number(discountTotal.toFixed(2));
      const deliveryFee = subtotal >= 499 ? 0 : 25;
      const tax = Number(((subtotal - discountTotal) * 0.05).toFixed(2));
      const total = Number((subtotal - discountTotal + deliveryFee + tax).toFixed(2));

      // 5. ATOMIC INVENTORY RESERVATION (Critical Concurrency Requirement)
      const reservedList: { productId: string; quantity: number }[] = [];
      for (const reqItem of requestedItems) {
        const updated = await InventoryModel.atomicReserveStock(
          storeId,
          reqItem.productId,
          reqItem.quantity
        );

        if (!updated) {
          failedOrders++;
          // Saga Compensation: Release all previously reserved items in this order
          for (const reserved of reservedList) {
            await InventoryModel.releaseReservedStock(storeId, reserved.productId, reserved.quantity);
          }

          const failedProd = productMap.get(reqItem.productId);
          throw new InsufficientStockError(
            `Insufficient stock for "${failedProd?.name || reqItem.productId}". Could not reserve ${reqItem.quantity} units.`
          );
        }

        reservedList.push({ productId: reqItem.productId, quantity: reqItem.quantity });
      }

      // 6. Create Order with Initial Timeline
      const initialTimeline = [
        {
          status: 'ORDER_PLACED' as OrderStatus,
          timestamp: new Date(),
          description: 'Order placed by customer',
        },
        {
          status: 'INVENTORY_RESERVED' as OrderStatus,
          timestamp: new Date(),
          description: 'Inventory atomically reserved from store',
        },
        {
          status: 'PREPARING_ORDER' as OrderStatus,
          timestamp: new Date(),
          description: 'Order sent to store dispatch queue for packing',
        },
      ];

      const order = await OrderModel.create({
        userId: new mongoose.Types.ObjectId(userId),
        storeId: new mongoose.Types.ObjectId(storeId),
        items: orderItems,
        subtotal,
        discount: discountTotal,
        deliveryFee,
        tax,
        total,
        paymentMethod,
        paymentStatus: paymentMethod === 'MOCK_ONLINE' ? 'PAID' : 'PENDING',
        orderStatus: 'PREPARING_ORDER',
        idempotencyKey,
        deliveryAddress,
        timeline: initialTimeline,
        estimatedDeliveryMinutes: 15,
      });

      successfulOrders++;

      // 7. Clear user's shopping cart
      await CartModel.findOneAndUpdate({ userId }, { items: [] });

      // 8. Publish RabbitMQ Events
      const orderDto = formatOrderDto(order);

      await broker.publish(EventTopics.ORDER_CREATED, {
        orderId: orderDto.id,
        userId: orderDto.userId,
        storeId: orderDto.storeId,
        items: orderDto.items,
        total: orderDto.total,
      });

      await broker.publish(EventTopics.ORDER_CONFIRMED, {
        order: orderDto,
      });

      await broker.publish(EventTopics.DELIVERY_ASSIGNMENT_REQUESTED, {
        orderId: orderDto.id,
        storeId: orderDto.storeId,
        deliveryAddress: orderDto.deliveryAddress,
        itemsCount: orderDto.items.length,
      });

      // Record Audit Event
      await OrderEventModel.create({
        orderId: order._id,
        eventType: EventTopics.ORDER_CONFIRMED,
        eventData: { total, itemsCount: orderItems.length },
        service: 'OrderService',
      });

      logger.info(`Order placed and confirmed: ${orderDto.id} for user ${userId}`);

      res.status(201).json({
        success: true,
        message: 'Order placed successfully',
        data: orderDto,
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/v1/orders - User Order History or Admin All Orders
app.get('/api/v1/orders', authenticateToken, async (req: Request, res: Response, next) => {
  try {
    const user = req.user!;
    const filter = user.role === 'ADMIN' ? {} : { userId: user.userId };

    const orders = await OrderModel.find(filter)
      .populate('storeId', 'name address')
      .sort({ createdAt: -1 })
      .limit(50);

    const dtoList = orders.map(formatOrderDto);

    res.json({
      success: true,
      message: 'Orders retrieved successfully',
      data: dtoList,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/orders/:orderId
app.get('/api/v1/orders/:orderId', authenticateToken, async (req: Request, res: Response, next) => {
  try {
    const { orderId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      throw new NotFoundError('Invalid order ID');
    }

    const order = await OrderModel.findById(orderId).populate('storeId', 'name address');
    if (!order) {
      throw new NotFoundError('Order not found');
    }

    // Role check: customer can only view own order
    if (req.user!.role !== 'ADMIN' && req.user!.role !== 'DELIVERY_PARTNER' && order.userId.toString() !== req.user!.userId) {
      throw new NotFoundError('Order not found');
    }

    res.json({
      success: true,
      message: 'Order retrieved successfully',
      data: formatOrderDto(order),
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/orders/:orderId/cancel - Order Cancellation with Stock Release
app.post('/api/v1/orders/:orderId/cancel', authenticateToken, async (req: Request, res: Response, next) => {
  try {
    const { orderId } = req.params;
    const order = await OrderModel.findById(orderId);
    if (!order) {
      throw new NotFoundError('Order not found');
    }

    if (req.user!.role !== 'ADMIN' && order.userId.toString() !== req.user!.userId) {
      throw new NotFoundError('Order not found');
    }

    if (['DELIVERED', 'CANCELLED', 'FAILED'].includes(order.orderStatus)) {
      throw new BadRequestError(`Cannot cancel order in status ${order.orderStatus}`);
    }

    order.orderStatus = 'CANCELLED';
    order.timeline.push({
      status: 'CANCELLED',
      timestamp: new Date(),
      description: 'Order cancelled. Inventory released back to store.',
    });
    await order.save();

    // Release stock via compensation
    for (const item of order.items) {
      await InventoryModel.releaseReservedStock(order.storeId, item.productId, item.quantity);
    }

    // Publish event
    await broker.publish(EventTopics.ORDER_CANCELLED, {
      orderId: order._id.toString(),
      userId: order.userId.toString(),
      storeId: order.storeId.toString(),
      items: order.items.map((i: any) => ({
        productId: i.productId.toString(),
        name: i.name,
        image: i.image,
        unit: i.unit,
        quantity: i.quantity,
        price: i.price,
        discountPrice: i.discountPrice,
      })),
      reason: req.body.reason || 'Customer requested cancellation',
    });

    await OrderEventModel.create({
      orderId: order._id,
      eventType: EventTopics.ORDER_CANCELLED,
      eventData: { reason: req.body.reason || 'Customer cancellation' },
      service: 'OrderService',
    });

    res.json({
      success: true,
      message: 'Order cancelled successfully and reserved inventory restored',
      data: formatOrderDto(order),
    });
  } catch (err) {
    next(err);
  }
});

app.use(errorHandler);

// Event Subscriptions
const setupSubscriptions = async () => {
  // Update order when delivery partner is assigned
  await broker.subscribe<DeliveryAssignedPayload>(
    'order.delivery.assigned.queue',
    EventTopics.DELIVERY_ASSIGNED,
    async (event) => {
      const { orderId, partnerId, partnerName, estimatedMinutes } = event.payload;
      const order = await OrderModel.findById(orderId);
      if (order && order.orderStatus !== 'CANCELLED') {
        order.orderStatus = 'DELIVERY_PARTNER_ASSIGNED';
        order.deliveryPartnerId = new mongoose.Types.ObjectId(partnerId);
        order.deliveryPartnerName = partnerName;
        order.estimatedDeliveryMinutes = estimatedMinutes;
        order.timeline.push({
          status: 'DELIVERY_PARTNER_ASSIGNED',
          timestamp: new Date(),
          description: `Delivery partner ${partnerName} assigned (ETA: ${estimatedMinutes} mins)`,
        });
        await order.save();
        logger.info(`Updated order ${orderId}: Delivery partner assigned`);
      }
    }
  );

  // Update order when delivery status changes
  await broker.subscribe<DeliveryStatusUpdatedPayload>(
    'order.delivery.status.queue',
    EventTopics.DELIVERY_STATUS_UPDATED,
    async (event) => {
      const { orderId, currentStatus } = event.payload;
      const order = await OrderModel.findById(orderId);
      if (!order || order.orderStatus === 'CANCELLED') return;

      let mappedOrderStatus: OrderStatus | null = null;
      let description = '';

      if (currentStatus === 'PICKED_UP') {
        mappedOrderStatus = 'PICKED_UP';
        description = 'Order picked up from store by delivery partner';
      } else if (currentStatus === 'OUT_FOR_DELIVERY') {
        mappedOrderStatus = 'OUT_FOR_DELIVERY';
        description = 'Delivery partner is on the way to your location';
      } else if (currentStatus === 'DELIVERED') {
        mappedOrderStatus = 'DELIVERED';
        description = 'Package delivered successfully. Enjoy your order!';
        // Fulfill stock
        for (const item of order.items) {
          await InventoryModel.fulfillReservedStock(order.storeId, item.productId, item.quantity);
        }
      }

      if (mappedOrderStatus) {
        order.orderStatus = mappedOrderStatus;
        order.timeline.push({
          status: mappedOrderStatus,
          timestamp: new Date(),
          description,
        });
        await order.save();
        logger.info(`Updated order ${orderId} stage to ${mappedOrderStatus}`);
      }
    }
  );
};

const start = async () => {
  try {
    await connectDatabase();
    logger.info('Connected to MongoDB');
    await setupSubscriptions();
    app.listen(PORT, () => {
      logger.info(`OrderService running on port ${PORT}`);
    });
  } catch (err) {
    logger.error(`Failed to start OrderService: ${(err as Error).message}`);
    process.exit(1);
  }
};

if (process.env.NODE_ENV !== 'test') {
  start();
}

export { app };
