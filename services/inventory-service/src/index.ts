import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { z } from 'zod';
import {
  connectDatabase,
  InventoryModel,
  StoreModel,
  ProductModel,
  getDbStatus,
} from '@quickcommerce/database';
import {
  createLogger,
  errorHandler,
  NotFoundError,
  InsufficientStockError,
  CacheService,
  getEventBroker,
  validateBody,
  authenticateToken,
  requireRoles,
} from '@quickcommerce/shared-utils';
import { EventTopics, DomainEvent, OrderCancelledPayload } from '@quickcommerce/event-schemas';
import { IStore, IInventory } from '@quickcommerce/shared-types';

dotenv.config({ path: '../../.env' });

const app = express();
const PORT = process.env.PORT_INVENTORY_SERVICE ? parseInt(process.env.PORT_INVENTORY_SERVICE, 10) : 4003;
const logger = createLogger('InventoryService');
const cache = new CacheService('InventoryService');
const broker = getEventBroker('InventoryService');

app.use(cors());
app.use(express.json());

const startTime = Date.now();
let reservationFailureCount = 0;

// Health Endpoint
app.get('/health', (_req: Request, res: Response) => {
  const db = getDbStatus();
  res.json({
    service: 'inventory-service',
    port: PORT,
    status: db.isConnected ? 'UP' : 'DEGRADED',
    uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
    database: db,
    cache: cache.getMetrics(),
    reservationFailures: reservationFailureCount,
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// Haversine distance calculator in KM
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

// GET /api/v1/stores
app.get('/api/v1/stores', async (_req: Request, res: Response, next) => {
  try {
    const stores = await StoreModel.find({ active: true });
    const dtoList: IStore[] = stores.map((s) => ({
      id: s._id.toString(),
      name: s.name,
      address: s.address,
      latitude: s.latitude,
      longitude: s.longitude,
      active: s.active,
    }));

    res.json({
      success: true,
      message: 'Stores retrieved successfully',
      data: dtoList,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/stores/:id
app.get('/api/v1/stores/:id', async (req: Request, res: Response, next) => {
  try {
    const { id } = req.params;
    const store = await StoreModel.findById(id);
    if (!store) {
      throw new NotFoundError('Store not found');
    }

    res.json({
      success: true,
      message: 'Store retrieved successfully',
      data: {
        id: store._id.toString(),
        name: store.name,
        address: store.address,
        latitude: store.latitude,
        longitude: store.longitude,
        active: store.active,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/inventory/nearby?lat=...&lon=...&radius=...
app.get('/api/v1/inventory/nearby', async (req: Request, res: Response, next) => {
  try {
    const lat = parseFloat((req.query.lat as string) || '11.0168');
    const lon = parseFloat((req.query.lon as string) || '76.9558');
    const radius = parseFloat((req.query.radius as string) || '15'); // 15km default

    const cacheKey = `nearby:${lat.toFixed(3)}:${lon.toFixed(3)}:${radius}`;
    const cached = await cache.get<IStore[]>(cacheKey);
    if (cached) {
      return res.json({
        success: true,
        message: 'Nearby stores retrieved (from cache)',
        data: cached,
        meta: { cached: true },
      });
    }

    const stores = await StoreModel.find({ active: true });
    const nearby = stores
      .map((s) => {
        const dist = calculateDistanceKm(lat, lon, s.latitude, s.longitude);
        return {
          id: s._id.toString(),
          name: s.name,
          address: s.address,
          latitude: s.latitude,
          longitude: s.longitude,
          active: s.active,
          distanceKm: dist,
        };
      })
      .filter((s) => s.distanceKm <= radius)
      .sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));

    // Cache nearby lookups for 5 seconds as specified in section 8
    await cache.set(cacheKey, nearby, 5);

    res.json({
      success: true,
      message: 'Nearby stores retrieved',
      data: nearby,
      meta: { cached: false, isDemonstrationData: true },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/inventory/store/:storeId
app.get('/api/v1/inventory/store/:storeId', async (req: Request, res: Response, next) => {
  try {
    const { storeId } = req.params;
    const inventory = await InventoryModel.find({ storeId })
      .populate('productId')
      .sort({ updatedAt: -1 });

    const dtoList: IInventory[] = inventory.map((inv) => {
      const prod = inv.productId as unknown as {
        _id: mongoose.Types.ObjectId;
        name: string;
        price: number;
        discount: number;
        image: string;
        unit: string;
      };

      return {
        id: inv._id.toString(),
        storeId: inv.storeId.toString(),
        productId: inv.productId._id ? inv.productId._id.toString() : inv.productId.toString(),
        availableQuantity: inv.availableQuantity,
        reservedQuantity: inv.reservedQuantity,
        updatedAt: inv.updatedAt.toISOString(),
        product: prod && prod.name ? {
          id: prod._id.toString(),
          name: prod.name,
          description: '',
          categoryId: '',
          image: prod.image,
          price: prod.price,
          discount: prod.discount,
          unit: prod.unit,
          active: true,
          createdAt: '',
          updatedAt: '',
        } : undefined,
      };
    });

    res.json({
      success: true,
      message: 'Store inventory retrieved',
      data: dtoList,
    });
  } catch (err) {
    next(err);
  }
});

// Reservation Schema
const reservationSchema = z.object({
  storeId: z.string(),
  orderId: z.string().optional(),
  items: z.array(
    z.object({
      productId: z.string(),
      quantity: z.number().int().positive(),
    })
  ).min(1),
});

// POST /api/v1/inventory/reservations - Atomic reservation with compensation
app.post('/api/v1/inventory/reservations', validateBody(reservationSchema), async (req: Request, res: Response, next) => {
  const { storeId, orderId, items } = req.body;
  const reservedItems: { productId: string; quantity: number }[] = [];

  try {
    for (const item of items) {
      const updated = await InventoryModel.atomicReserveStock(
        storeId,
        item.productId,
        item.quantity
      );

      if (!updated) {
        reservationFailureCount++;
        // Compensation: Roll back any previous items reserved in this multi-item batch
        for (const reserved of reservedItems) {
          await InventoryModel.releaseReservedStock(storeId, reserved.productId, reserved.quantity);
        }

        const product = await ProductModel.findById(item.productId);
        const invRecord = await InventoryModel.findOne({ storeId, productId: item.productId });
        const available = invRecord ? invRecord.availableQuantity : 0;

        await broker.publish(EventTopics.INVENTORY_RESERVATION_FAILED, {
          orderId: orderId || 'unknown',
          storeId,
          reason: `Insufficient inventory for ${product?.name || item.productId}`,
          failedItems: [{ productId: item.productId, requested: item.quantity, available }],
        });

        throw new InsufficientStockError(
          `Only ${available} unit(s) available for "${product?.name || item.productId}". Requested: ${item.quantity}`
        );
      }

      reservedItems.push(item);
    }

    // Invalidate nearby inventory cache
    await cache.delPattern('nearby:*');

    // Publish event
    await broker.publish(EventTopics.INVENTORY_RESERVED, {
      orderId: orderId || 'unknown',
      storeId,
      items: reservedItems,
      success: true,
    });

    res.json({
      success: true,
      message: 'Inventory reserved successfully',
      data: {
        storeId,
        orderId,
        items: reservedItems,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/inventory/release - Release reservations (Cancellation / Failure compensation)
app.post('/api/v1/inventory/release', validateBody(reservationSchema), async (req: Request, res: Response, next) => {
  try {
    const { storeId, items } = req.body;
    for (const item of items) {
      await InventoryModel.releaseReservedStock(storeId, item.productId, item.quantity);
    }
    await cache.delPattern('nearby:*');

    res.json({
      success: true,
      message: 'Reserved stock released successfully',
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/inventory/fulfill - Fulfill reserved stock
app.post('/api/v1/inventory/fulfill', validateBody(reservationSchema), async (req: Request, res: Response, next) => {
  try {
    const { storeId, items } = req.body;
    for (const item of items) {
      await InventoryModel.fulfillReservedStock(storeId, item.productId, item.quantity);
    }

    res.json({
      success: true,
      message: 'Reserved stock fulfilled',
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/inventory/:id (Admin only)
const patchInventorySchema = z.object({
  availableQuantity: z.number().int().min(0).optional(),
  reservedQuantity: z.number().int().min(0).optional(),
});

app.patch(
  '/api/v1/inventory/:id',
  authenticateToken,
  requireRoles('ADMIN'),
  validateBody(patchInventorySchema),
  async (req: Request, res: Response, next) => {
    try {
      const { id } = req.params;
      const inv = await InventoryModel.findByIdAndUpdate(id, req.body, { new: true });
      if (!inv) {
        throw new NotFoundError('Inventory record not found');
      }

      await cache.delPattern('nearby:*');
      await broker.publish(EventTopics.INVENTORY_UPDATED, {
        storeId: inv.storeId.toString(),
        productId: inv.productId.toString(),
        availableQuantity: inv.availableQuantity,
        reservedQuantity: inv.reservedQuantity,
      });

      res.json({
        success: true,
        message: 'Inventory updated successfully',
        data: inv,
      });
    } catch (err) {
      next(err);
    }
  }
);

app.use(errorHandler);

// Subscribe to Order Cancelled events to release reserved stock automatically
const setupSubscriptions = async () => {
  await broker.subscribe<OrderCancelledPayload>(
    'inventory.order.cancelled.queue',
    EventTopics.ORDER_CANCELLED,
    async (event) => {
      const { storeId, items } = event.payload;
      logger.info(`Auto-releasing stock for cancelled order ${event.payload.orderId}`);
      for (const item of items) {
        await InventoryModel.releaseReservedStock(storeId, item.productId, item.quantity);
      }
      await cache.delPattern('nearby:*');
    }
  );
};

const start = async () => {
  try {
    await connectDatabase();
    logger.info('Connected to MongoDB');
    await setupSubscriptions();
    app.listen(PORT, () => {
      logger.info(`InventoryService running on port ${PORT}`);
    });
  } catch (err) {
    logger.error(`Failed to start InventoryService: ${(err as Error).message}`);
    process.exit(1);
  }
};

if (process.env.NODE_ENV !== 'test') {
  start();
}

export { app, calculateDistanceKm };
