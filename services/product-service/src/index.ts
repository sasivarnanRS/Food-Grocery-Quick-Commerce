import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { z } from 'zod';
import {
  connectDatabase,
  ProductModel,
  CategoryModel,
  getDbStatus,
} from '@quickcommerce/database';
import {
  createLogger,
  errorHandler,
  NotFoundError,
  CacheService,
  getEventBroker,
  authenticateToken,
  requireRoles,
  validateBody,
} from '@quickcommerce/shared-utils';
import { ApiResponse, IProduct, ICategory } from '@quickcommerce/shared-types';

dotenv.config({ path: '../../.env' });

const app = express();
const PORT = process.env.PORT_PRODUCT_SERVICE ? parseInt(process.env.PORT_PRODUCT_SERVICE, 10) : 4002;
const INSTANCE_ID = process.env.INSTANCE_ID || `ProductService-${PORT}`;
const logger = createLogger(INSTANCE_ID);
const cache = new CacheService(INSTANCE_ID);
const broker = getEventBroker(INSTANCE_ID);

app.use(cors());
app.use(express.json());

// Set X-Served-By header for load balancing verification
app.use((_req, res, next) => {
  res.setHeader('X-Served-By', INSTANCE_ID);
  next();
});

const startTime = Date.now();

// Health Endpoint
app.get('/health', (_req: Request, res: Response) => {
  const db = getDbStatus();
  const cacheMetrics = cache.getMetrics();
  res.json({
    service: 'product-service',
    instanceId: INSTANCE_ID,
    port: PORT,
    status: db.isConnected ? 'UP' : 'DEGRADED',
    uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
    database: db,
    cache: cacheMetrics,
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// Cache Metrics Endpoint
app.get('/api/v1/products/cache-metrics', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: cache.getMetrics(),
  });
});

// GET /api/v1/categories - Cached for 15 minutes
app.get('/api/v1/categories', async (_req: Request, res: Response, next) => {
  try {
    const cacheKey = 'categories:all';
    const cached = await cache.get<ICategory[]>(cacheKey);
    if (cached) {
      return res.json({
        success: true,
        message: 'Categories retrieved (from cache)',
        data: cached,
        meta: { cached: true, servedBy: INSTANCE_ID },
      });
    }

    const categories = await CategoryModel.find({ active: true }).sort({ name: 1 });
    const dtoList: ICategory[] = categories.map((c) => ({
      id: c._id.toString(),
      name: c.name,
      slug: c.slug,
      image: c.image,
      active: c.active,
    }));

    await cache.set(cacheKey, dtoList, 900); // 15 mins

    res.json({
      success: true,
      message: 'Categories retrieved',
      data: dtoList,
      meta: { cached: false, servedBy: INSTANCE_ID },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/categories (Admin only)
const createCategorySchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2),
  image: z.string().url(),
});

app.post(
  '/api/v1/categories',
  authenticateToken,
  requireRoles('ADMIN'),
  validateBody(createCategorySchema),
  async (req: Request, res: Response, next) => {
    try {
      const category = await CategoryModel.create(req.body);
      await cache.del('categories:all');

      res.status(201).json({
        success: true,
        message: 'Category created',
        data: {
          id: category._id.toString(),
          name: category.name,
          slug: category.slug,
          image: category.image,
          active: category.active,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/v1/products - Search, Category Filter, Pagination, Caching
app.get('/api/v1/products', async (req: Request, res: Response, next) => {
  try {
    const search = (req.query.search as string) || '';
    const category = (req.query.category as string) || '';
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt((req.query.limit as string) || '20', 10)));
    const skip = (page - 1) * limit;

    const cacheKey = `products:query:${search}:${category}:${page}:${limit}`;
    const cached = await cache.get<{ items: IProduct[]; total: number }>(cacheKey);

    if (cached) {
      return res.json({
        success: true,
        message: 'Products retrieved (from cache)',
        data: cached.items,
        meta: {
          page,
          limit,
          total: cached.total,
          totalPages: Math.ceil(cached.total / limit),
          cached: true,
          servedBy: INSTANCE_ID,
        },
      });
    }

    const filter: Record<string, unknown> = { active: true };

    if (category) {
      if (mongoose.Types.ObjectId.isValid(category)) {
        filter.categoryId = new mongoose.Types.ObjectId(category);
      } else {
        const catDoc = await CategoryModel.findOne({ slug: category });
        if (catDoc) {
          filter.categoryId = catDoc._id;
        }
      }
    }

    if (search.trim()) {
      filter.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { description: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    const [products, total] = await Promise.all([
      ProductModel.find(filter)
        .populate('categoryId', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      ProductModel.countDocuments(filter),
    ]);

    const dtoList: IProduct[] = products.map((p) => {
      const cat = p.categoryId as unknown as { name?: string };
      return {
        id: p._id.toString(),
        name: p.name,
        description: p.description,
        categoryId: p.categoryId._id ? p.categoryId._id.toString() : p.categoryId.toString(),
        categoryName: cat?.name || '',
        image: p.image,
        price: p.price,
        discount: p.discount,
        unit: p.unit,
        active: p.active,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      };
    });

    const ttl = search.trim() ? 60 : 300; // 60s for popular search, 5m for static browse
    await cache.set(cacheKey, { items: dtoList, total }, ttl);

    res.json({
      success: true,
      message: 'Products retrieved',
      data: dtoList,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        cached: false,
        servedBy: INSTANCE_ID,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/products/:id - Cached for 5 minutes
app.get('/api/v1/products/:id', async (req: Request, res: Response, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError('Invalid product ID');
    }

    const cacheKey = `product:${id}`;
    const cached = await cache.get<IProduct>(cacheKey);
    if (cached) {
      return res.json({
        success: true,
        message: 'Product retrieved (from cache)',
        data: cached,
        meta: { cached: true, servedBy: INSTANCE_ID },
      });
    }

    const product = await ProductModel.findById(id).populate('categoryId', 'name');
    if (!product) {
      throw new NotFoundError('Product not found');
    }

    const cat = product.categoryId as unknown as { name?: string };
    const dto: IProduct = {
      id: product._id.toString(),
      name: product.name,
      description: product.description,
      categoryId: product.categoryId._id ? product.categoryId._id.toString() : product.categoryId.toString(),
      categoryName: cat?.name || '',
      image: product.image,
      price: product.price,
      discount: product.discount,
      unit: product.unit,
      active: product.active,
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
    };

    await cache.set(cacheKey, dto, 300); // 5 mins

    res.json({
      success: true,
      message: 'Product retrieved successfully',
      data: dto,
      meta: { cached: false, servedBy: INSTANCE_ID },
    });
  } catch (err) {
    next(err);
  }
});

// Product Mutation Schema
const productMutationSchema = z.object({
  name: z.string().min(2),
  description: z.string().min(5),
  categoryId: z.string(),
  image: z.string().url(),
  price: z.number().positive(),
  discount: z.number().min(0).max(100).optional(),
  unit: z.string().min(1),
  active: z.boolean().optional(),
});

// POST /api/v1/products (Admin only)
app.post(
  '/api/v1/products',
  authenticateToken,
  requireRoles('ADMIN'),
  validateBody(productMutationSchema),
  async (req: Request, res: Response, next) => {
    try {
      const product = await ProductModel.create({
        ...req.body,
        categoryId: new mongoose.Types.ObjectId(req.body.categoryId),
      });

      // Invalidate query caches
      await cache.delPattern('products:query:*');

      res.status(201).json({
        success: true,
        message: 'Product created successfully',
        data: {
          id: product._id.toString(),
          name: product.name,
          price: product.price,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /api/v1/products/:id (Admin only)
app.patch(
  '/api/v1/products/:id',
  authenticateToken,
  requireRoles('ADMIN'),
  validateBody(productMutationSchema.partial()),
  async (req: Request, res: Response, next) => {
    try {
      const { id } = req.params;
      const product = await ProductModel.findByIdAndUpdate(id, req.body, { new: true });
      if (!product) {
        throw new NotFoundError('Product not found');
      }

      // Invalidate individual item and query caches
      await cache.del(`product:${id}`);
      await cache.delPattern('products:query:*');

      res.json({
        success: true,
        message: 'Product updated successfully',
        data: {
          id: product._id.toString(),
          name: product.name,
          price: product.price,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/v1/products/:id (Admin only)
app.delete(
  '/api/v1/products/:id',
  authenticateToken,
  requireRoles('ADMIN'),
  async (req: Request, res: Response, next) => {
    try {
      const { id } = req.params;
      const product = await ProductModel.findByIdAndUpdate(id, { active: false }, { new: true });
      if (!product) {
        throw new NotFoundError('Product not found');
      }

      await cache.del(`product:${id}`);
      await cache.delPattern('products:query:*');

      res.json({
        success: true,
        message: 'Product deleted successfully',
      });
    } catch (err) {
      next(err);
    }
  }
);

app.use(errorHandler);

const start = async () => {
  try {
    await connectDatabase();
    logger.info('Connected to MongoDB');
    app.listen(PORT, () => {
      logger.info(`ProductService [${INSTANCE_ID}] running on port ${PORT}`);
    });
  } catch (err) {
    logger.error(`Failed to start ProductService: ${(err as Error).message}`);
    process.exit(1);
  }
};

if (process.env.NODE_ENV !== 'test') {
  start();
}

export { app, cache };
