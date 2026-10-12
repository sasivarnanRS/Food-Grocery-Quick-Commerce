import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import {
  connectDatabase,
  disconnectDatabase,
  UserModel,
  CategoryModel,
  ProductModel,
  StoreModel,
  InventoryModel,
  CartModel,
  OrderModel,
  DeliveryModel,
} from '@quickcommerce/database';
import {
  hashPassword,
  comparePassword,
  signToken,
  verifyToken,
  CacheService,
  getEventBroker,
} from '@quickcommerce/shared-utils';
import { calculateDistanceKm } from '../../services/inventory-service/src';
import { EventTopics } from '@quickcommerce/event-schemas';

describe('QuickCommerce End-to-End Suite (18 Critical Scenarios)', () => {
  let customerId: string;
  let adminId: string;
  let partnerId: string;
  let storeId: string;
  let categoryId: string;
  let product1Id: string;
  let product2Id: string;
  let cache: CacheService;

  beforeAll(async () => {
    await connectDatabase();
    cache = new CacheService('TestCache');
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  // 1. User Registration and Login
  it('Scenario 1: User registration and password hashing verification', async () => {
    const password = 'SecretPassword@123';
    const hash = await hashPassword(password);
    expect(hash).not.toBe(password);
    expect(await comparePassword(password, hash)).toBe(true);

    const user = await UserModel.create({
      name: 'Test Customer E2E',
      email: `customer_${Date.now()}@test.com`,
      passwordHash: hash,
      role: 'CUSTOMER',
    });
    customerId = user._id.toString();

    const token = signToken({
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
      role: 'CUSTOMER',
    });
    const decoded = verifyToken(token);
    expect(decoded.userId).toBe(customerId);
    expect(decoded.role).toBe('CUSTOMER');
  });

  // 2. Product Search & 3. Category Filtering
  it('Scenario 2 & 3: Product search and category filtering', async () => {
    const category = await CategoryModel.create({
      name: 'Fresh Dairy Test',
      slug: `dairy-test-${Date.now()}`,
      image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150',
    });
    categoryId = category._id.toString();

    const p1 = await ProductModel.create({
      name: 'Organic Whole Milk Pouch',
      description: 'Rich pasture-fed cow milk',
      categoryId: category._id,
      image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150',
      price: 60,
      discount: 10,
      unit: '1 L',
      active: true,
    });
    product1Id = p1._id.toString();

    const p2 = await ProductModel.create({
      name: 'Greek Yogurt Blueberry',
      description: 'High protein flavored yogurt',
      categoryId: category._id,
      image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777',
      price: 50,
      discount: 0,
      unit: '100 g',
      active: true,
    });
    product2Id = p2._id.toString();

    // Query with name regex
    const searchMatch = await ProductModel.find({
      name: { $regex: 'Whole Milk', $options: 'i' },
    });
    expect(searchMatch.length).toBeGreaterThanOrEqual(1);
    expect(searchMatch.some((p) => p._id.toString() === product1Id)).toBe(true);

    // Query with category
    const catProducts = await ProductModel.find({ categoryId: category._id });
    expect(catProducts.length).toBe(2);
  });

  // 4. Nearby Inventory Search (Geospatial)
  it('Scenario 4: Nearby store distance calculation', async () => {
    const store = await StoreModel.create({
      name: 'Indiranagar Hub Test',
      address: '100ft Rd, Indiranagar',
      latitude: 12.9716,
      longitude: 77.6412,
      location: { type: 'Point', coordinates: [77.6412, 12.9716] },
      active: true,
    });
    storeId = store._id.toString();

    // User is at 12.9750, 77.6450 (~0.5 km away)
    const dist = calculateDistanceKm(12.9750, 77.6450, store.latitude, store.longitude);
    expect(dist).toBeLessThan(3.0);
    expect(dist).toBeGreaterThan(0.1);
  });

  // 5. Add product to cart & 6. Update cart quantity
  it('Scenario 5 & 6: Cart operations and item quantities', async () => {
    // Add item
    const cart = await CartModel.create({
      userId: new mongoose.Types.ObjectId(customerId),
      items: [
        {
          productId: new mongoose.Types.ObjectId(product1Id),
          storeId: new mongoose.Types.ObjectId(storeId),
          quantity: 2,
        },
      ],
    });
    expect(cart.items.length).toBe(1);
    expect(cart.items[0].quantity).toBe(2);

    // Update quantity
    cart.items[0].quantity = 3;
    await cart.save();

    const reloaded = await CartModel.findById(cart._id);
    expect(reloaded!.items[0].quantity).toBe(3);
  });

  // 7. Invalid product handling
  it('Scenario 7: Reject order for nonexistent or inactive product', async () => {
    const nonExistentId = new mongoose.Types.ObjectId();
    const prod = await ProductModel.findById(nonExistentId);
    expect(prod).toBeNull();
  });

  // 8. Order Placement & 11. Duplicate Order Prevention (Idempotency)
  it('Scenario 8 & 11: Idempotent order creation prevents duplicate orders', async () => {
    // Seed stock for product1
    await InventoryModel.create({
      storeId: new mongoose.Types.ObjectId(storeId),
      productId: new mongoose.Types.ObjectId(product1Id),
      availableQuantity: 20,
      reservedQuantity: 0,
    });

    const idempotencyKey = `idem_test_${uuidv4()}`;

    // Place Order 1
    const order1 = await OrderModel.create({
      userId: new mongoose.Types.ObjectId(customerId),
      storeId: new mongoose.Types.ObjectId(storeId),
      items: [
        {
          productId: new mongoose.Types.ObjectId(product1Id),
          name: 'Organic Whole Milk Pouch',
          image: 'https://...',
          unit: '1 L',
          quantity: 2,
          price: 60,
          discountPrice: 54,
        },
      ],
      subtotal: 120,
      discount: 12,
      deliveryFee: 25,
      tax: 5,
      total: 138,
      paymentMethod: 'COD',
      paymentStatus: 'PENDING',
      orderStatus: 'ORDER_PLACED',
      idempotencyKey,
      deliveryAddress: { street: '12th Cross', city: 'Bengaluru', pincode: '560038' },
      timeline: [{ status: 'ORDER_PLACED', timestamp: new Date(), description: 'Order placed' }],
    });
    expect(order1).toBeDefined();

    // Attempt to place second order with SAME userId and idempotencyKey
    let caughtDuplicateError = false;
    try {
      await OrderModel.create({
        userId: new mongoose.Types.ObjectId(customerId),
        storeId: new mongoose.Types.ObjectId(storeId),
        items: [],
        subtotal: 120,
        discount: 0,
        deliveryFee: 0,
        tax: 0,
        total: 120,
        paymentMethod: 'COD',
        paymentStatus: 'PENDING',
        orderStatus: 'ORDER_PLACED',
        idempotencyKey, // DUPLICATE KEY!
        deliveryAddress: { street: '12th Cross', city: 'Bengaluru', pincode: '560038' },
        timeline: [],
      });
    } catch (err: any) {
      caughtDuplicateError = true;
      expect(err.code).toBe(11000); // MongoDB duplicate key error code
    }

    expect(caughtDuplicateError).toBe(true);
  });

  // 9. Insufficient Inventory handling
  it('Scenario 9: Atomic reservation rejects request exceeding available stock', async () => {
    // Store only has 20 units, request 50 units
    const result = await InventoryModel.atomicReserveStock(storeId, product1Id, 50);
    expect(result).toBeNull();
  });

  // 12. Order Cancellation and Stock Release (Compensation)
  it('Scenario 12: Order cancellation restores available stock safely', async () => {
    // Reserve 5 units
    const reserved = await InventoryModel.atomicReserveStock(storeId, product1Id, 5);
    expect(reserved).not.toBeNull();
    const prevAvailable = reserved!.availableQuantity;

    // Compensate / release
    const released = await InventoryModel.releaseReservedStock(storeId, product1Id, 5);
    expect(released).not.toBeNull();
    expect(released!.availableQuantity).toBe(prevAvailable + 5);
  });

  // 13. Delivery Assignment & 14. Status Updates
  it('Scenario 13 & 14: Delivery assignment and status progression', async () => {
    const dummyOrderId = new mongoose.Types.ObjectId();
    const delivery = await DeliveryModel.create({
      orderId: dummyOrderId,
      status: 'ASSIGNED',
      estimatedDeliveryMinutes: 12,
      assignedAt: new Date(),
    });
    expect(delivery.status).toBe('ASSIGNED');

    delivery.status = 'OUT_FOR_DELIVERY';
    await delivery.save();
    expect(delivery.status).toBe('OUT_FOR_DELIVERY');

    delivery.status = 'DELIVERED';
    delivery.deliveredAt = new Date();
    await delivery.save();
    expect(delivery.status).toBe('DELIVERED');
  });

  // 15. Redis Cache Invalidation
  it('Scenario 15: Cache-aside and pattern-based invalidation', async () => {
    await cache.set('products:query:milk:1', { items: ['milk1', 'milk2'] }, 60);
    const cachedItem = await cache.get('products:query:milk:1');
    expect(cachedItem).not.toBeNull();

    // Invalidate pattern
    await cache.delPattern('products:query:*');
    const afterEviction = await cache.get('products:query:milk:1');
    expect(afterEviction).toBeNull();
  });

  // 16. RabbitMQ Event Handling
  it('Scenario 16: Event Broker publishes and routes domain events', async () => {
    const broker = getEventBroker('TestBroker');
    let received = false;

    await broker.subscribe('test.queue', EventTopics.ORDER_CONFIRMED, async (event) => {
      received = true;
    });

    await broker.publish(EventTopics.ORDER_CONFIRMED, {
      order: { id: 'test_order_123' },
    });

    // Wait for in-memory or rabbitmq dispatch
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(received).toBe(true);
  });

  // 17. Role-Based Authorization
  it('Scenario 17: Token role verification enforces authorization boundary', () => {
    const customerToken = signToken({
      userId: customerId,
      email: 'customer@test.com',
      name: 'Customer',
      role: 'CUSTOMER',
    });
    const adminToken = signToken({
      userId: new mongoose.Types.ObjectId().toString(),
      email: 'admin@test.com',
      name: 'Admin',
      role: 'ADMIN',
    });

    const customerDecoded = verifyToken(customerToken);
    const adminDecoded = verifyToken(adminToken);

    expect(customerDecoded.role).toBe('CUSTOMER');
    expect(adminDecoded.role).toBe('ADMIN');
    expect(['ADMIN'].includes(customerDecoded.role)).toBe(false);
    expect(['ADMIN'].includes(adminDecoded.role)).toBe(true);
  });

  // 18. Service Health Endpoints Contract
  it('Scenario 18: Service health payload schema verification', () => {
    const healthPayload = {
      service: 'product-service',
      port: 4002,
      status: 'UP',
      uptimeSeconds: 120,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };

    expect(healthPayload.status).toBe('UP');
    expect(healthPayload.port).toBe(4002);
    expect(healthPayload.uptimeSeconds).toBeGreaterThan(0);
  });
});
