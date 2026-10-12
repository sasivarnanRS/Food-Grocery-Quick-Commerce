import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { z } from 'zod';
import {
  connectDatabase,
  CartModel,
  ProductModel,
  StoreModel,
  getDbStatus,
} from '@quickcommerce/database';
import {
  createLogger,
  errorHandler,
  NotFoundError,
  BadRequestError,
  authenticateToken,
  validateBody,
} from '@quickcommerce/shared-utils';
import { ApiResponse, ICart, ICartItem } from '@quickcommerce/shared-types';

dotenv.config({ path: '../../.env' });

const app = express();
const PORT = process.env.PORT_CART_SERVICE ? parseInt(process.env.PORT_CART_SERVICE, 10) : 4004;
const logger = createLogger('CartService');

app.use(cors());
app.use(express.json());

const startTime = Date.now();

// Health Check
app.get('/health', (_req: Request, res: Response) => {
  const db = getDbStatus();
  res.json({
    service: 'cart-service',
    port: PORT,
    status: db.isConnected ? 'UP' : 'DEGRADED',
    uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
    database: db,
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// Helper: Compute Cart Totals from Trusted Product Data
async function buildCartResponse(userId: string): Promise<ICart> {
  const cartDoc = await CartModel.findOne({ userId });
  if (!cartDoc || cartDoc.items.length === 0) {
    return {
      id: cartDoc ? cartDoc._id.toString() : new mongoose.Types.ObjectId().toString(),
      userId,
      items: [],
      subtotal: 0,
      discountTotal: 0,
      deliveryFee: 0,
      tax: 0,
      grandTotal: 0,
      updatedAt: cartDoc ? cartDoc.updatedAt.toISOString() : new Date().toISOString(),
    };
  }

  const productIds = cartDoc.items.map((i: any) => i.productId);
  const products = await ProductModel.find({ _id: { $in: productIds } });
  const productMap = new Map(products.map((p) => [p._id.toString(), p]));

  let subtotal = 0;
  let discountTotal = 0;
  const enrichedItems: ICartItem[] = [];

  for (const item of cartDoc.items) {
    const prod = productMap.get(item.productId.toString());
    if (!prod || !prod.active) continue;

    const unitPrice = prod.price;
    const discountAmount = prod.discount ? (prod.price * prod.discount) / 100 : 0;
    const discountPrice = Number((unitPrice - discountAmount).toFixed(2));

    subtotal += unitPrice * item.quantity;
    discountTotal += discountAmount * item.quantity;

    enrichedItems.push({
      productId: prod._id.toString(),
      storeId: item.storeId.toString(),
      quantity: item.quantity,
      unitPrice,
      discountPrice,
      product: {
        id: prod._id.toString(),
        name: prod.name,
        description: prod.description,
        categoryId: prod.categoryId.toString(),
        image: prod.image,
        price: prod.price,
        discount: prod.discount,
        unit: prod.unit,
        active: prod.active,
        createdAt: prod.createdAt.toISOString(),
        updatedAt: prod.updatedAt.toISOString(),
      },
    });
  }

  subtotal = Number(subtotal.toFixed(2));
  discountTotal = Number(discountTotal.toFixed(2));
  const deliveryFee = subtotal > 0 ? (subtotal >= 499 ? 0 : 25) : 0;
  const tax = Number(((subtotal - discountTotal) * 0.05).toFixed(2)); // 5% GST
  const grandTotal = Number((subtotal - discountTotal + deliveryFee + tax).toFixed(2));

  return {
    id: cartDoc._id.toString(),
    userId,
    items: enrichedItems,
    subtotal,
    discountTotal,
    deliveryFee,
    tax,
    grandTotal: Math.max(0, grandTotal),
    updatedAt: cartDoc.updatedAt.toISOString(),
  };
}

// GET /api/v1/cart
app.get('/api/v1/cart', authenticateToken, async (req: Request, res: Response, next) => {
  try {
    const cart = await buildCartResponse(req.user!.userId);
    res.json({
      success: true,
      message: 'Cart retrieved successfully',
      data: cart,
    });
  } catch (err) {
    next(err);
  }
});

// Item Schema
const cartItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().positive(),
  storeId: z.string(),
});

// POST /api/v1/cart/items
app.post(
  '/api/v1/cart/items',
  authenticateToken,
  validateBody(cartItemSchema),
  async (req: Request, res: Response, next) => {
    try {
      const { productId, quantity, storeId } = req.body;
      const userId = req.user!.userId;

      // Validate product exists and is active
      const product = await ProductModel.findById(productId);
      if (!product || !product.active) {
        throw new NotFoundError('Product not found or inactive');
      }

      // Validate store exists
      const store = await StoreModel.findById(storeId);
      if (!store || !store.active) {
        throw new NotFoundError('Store not found or inactive');
      }

      let cart = await CartModel.findOne({ userId });
      if (!cart) {
        cart = new CartModel({
          userId: new mongoose.Types.ObjectId(userId),
          items: [],
        });
      }

      const existingIndex = cart.items.findIndex(
        (i: any) => i.productId.toString() === productId && i.storeId.toString() === storeId
      );

      if (existingIndex > -1) {
        cart.items[existingIndex].quantity += quantity;
      } else {
        cart.items.push({
          productId: new mongoose.Types.ObjectId(productId),
          storeId: new mongoose.Types.ObjectId(storeId),
          quantity,
        });
      }

      await cart.save();
      const updatedCart = await buildCartResponse(userId);

      logger.info(`Item ${productId} added to cart for user ${userId}`);

      res.status(201).json({
        success: true,
        message: 'Item added to cart',
        data: updatedCart,
      });
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /api/v1/cart/items/:itemId
const updateItemSchema = z.object({
  quantity: z.number().int().min(0),
});

app.patch(
  '/api/v1/cart/items/:itemId',
  authenticateToken,
  validateBody(updateItemSchema),
  async (req: Request, res: Response, next) => {
    try {
      const { itemId } = req.params; // itemId is productId
      const { quantity } = req.body;
      const userId = req.user!.userId;

      const cart = await CartModel.findOne({ userId });
      if (!cart) {
        throw new NotFoundError('Cart not found');
      }

      const itemIndex = cart.items.findIndex((i: any) => i.productId.toString() === itemId);
      if (itemIndex === -1) {
        throw new NotFoundError('Item not found in cart');
      }

      if (quantity === 0) {
        cart.items.splice(itemIndex, 1);
      } else {
        cart.items[itemIndex].quantity = quantity;
      }

      await cart.save();
      const updatedCart = await buildCartResponse(userId);

      res.json({
        success: true,
        message: 'Cart item updated',
        data: updatedCart,
      });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/v1/cart/items/:itemId
app.delete(
  '/api/v1/cart/items/:itemId',
  authenticateToken,
  async (req: Request, res: Response, next) => {
    try {
      const { itemId } = req.params;
      const userId = req.user!.userId;

      const cart = await CartModel.findOne({ userId });
      if (!cart) {
        throw new NotFoundError('Cart not found');
      }

      cart.items = cart.items.filter((i: any) => i.productId.toString() !== itemId);
      await cart.save();

      const updatedCart = await buildCartResponse(userId);

      res.json({
        success: true,
        message: 'Item removed from cart',
        data: updatedCart,
      });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/v1/cart - Clear cart
app.delete('/api/v1/cart', authenticateToken, async (req: Request, res: Response, next) => {
  try {
    const userId = req.user!.userId;
    await CartModel.findOneAndUpdate({ userId }, { items: [] });

    res.json({
      success: true,
      message: 'Cart cleared successfully',
      data: null,
    });
  } catch (err) {
    next(err);
  }
});

app.use(errorHandler);

const start = async () => {
  try {
    await connectDatabase();
    logger.info('Connected to MongoDB');
    app.listen(PORT, () => {
      logger.info(`CartService running on port ${PORT}`);
    });
  } catch (err) {
    logger.error(`Failed to start CartService: ${(err as Error).message}`);
    process.exit(1);
  }
};

if (process.env.NODE_ENV !== 'test') {
  start();
}

export { app };
