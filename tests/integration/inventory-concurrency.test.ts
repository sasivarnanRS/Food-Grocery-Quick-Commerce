import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import {
  connectDatabase,
  disconnectDatabase,
  InventoryModel,
  StoreModel,
  ProductModel,
  UserModel,
  OrderModel,
} from '@quickcommerce/database';

describe('Critical Concurrency Requirement: Single Final Unit Race Condition', () => {
  let storeId: string;
  let productId: string;

  beforeAll(async () => {
    await connectDatabase();

    // Create a dedicated test store and product
    const store = await StoreModel.create({
      name: 'Contention Test Store',
      address: 'Test Rd, Contention Lab',
      latitude: 12.9716,
      longitude: 77.6412,
      location: { type: 'Point', coordinates: [77.6412, 12.9716] },
      active: true,
    });
    storeId = store._id.toString();

    const product = await ProductModel.create({
      name: 'Final Carton Amul Milk',
      description: 'Single stock race condition test subject',
      categoryId: new mongoose.Types.ObjectId(),
      image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150',
      price: 30,
      discount: 0,
      unit: '500 ml',
      active: true,
    });
    productId = product._id.toString();

    // Set exactly 1 unit available!
    await InventoryModel.create({
      storeId: store._id,
      productId: product._id,
      availableQuantity: 1,
      reservedQuantity: 0,
    });
  });

  afterAll(async () => {
    await InventoryModel.deleteMany({ storeId });
    await StoreModel.findByIdAndDelete(storeId);
    await ProductModel.findByIdAndDelete(productId);
    await disconnectDatabase();
  });

  it('proves that two simultaneous customer requests cannot reserve the same final unit', async () => {
    // Two simultaneous atomic reservations for 1 unit
    const reservationPromises = [
      InventoryModel.atomicReserveStock(storeId, productId, 1),
      InventoryModel.atomicReserveStock(storeId, productId, 1),
    ];

    const results = await Promise.all(reservationPromises);

    // Exactly one operation must succeed (non-null document) and the other must fail (null document)
    const successCount = results.filter((r) => r !== null).length;
    const failureCount = results.filter((r) => r === null).length;

    expect(successCount).toBe(1);
    expect(failureCount).toBe(1);

    // Verify final state in database
    const finalInventory = await InventoryModel.findOne({ storeId, productId });
    expect(finalInventory).not.toBeNull();
    expect(finalInventory!.availableQuantity).toBe(0);
    expect(finalInventory!.reservedQuantity).toBe(1);
    expect(finalInventory!.availableQuantity).not.toBeLessThan(0);
  });

  it('safely releases reservation when compensated upon cancellation', async () => {
    // Release the 1 reserved unit
    const released = await InventoryModel.releaseReservedStock(storeId, productId, 1);
    expect(released).not.toBeNull();
    expect(released!.availableQuantity).toBe(1);
    expect(released!.reservedQuantity).toBe(0);
  });
});
