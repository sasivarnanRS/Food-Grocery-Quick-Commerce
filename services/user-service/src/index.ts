import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { z } from 'zod';
import { connectDatabase, UserModel, getDbStatus } from '@quickcommerce/database';
import {
  createLogger,
  errorHandler,
  BadRequestError,
  UnauthorizedError,
  ConflictError,
  hashPassword,
  comparePassword,
  signToken,
  authenticateToken,
  validateBody,
} from '@quickcommerce/shared-utils';
import { ApiResponse, IUser, UserRole } from '@quickcommerce/shared-types';

dotenv.config({ path: '../../.env' });

const app = express();
const PORT = process.env.PORT_USER_SERVICE ? parseInt(process.env.PORT_USER_SERVICE, 10) : 4001;
const logger = createLogger('UserService');

app.use(cors());
app.use(express.json());

// Track start time for uptime
const startTime = Date.now();

// Health Check
app.get('/health', (_req: Request, res: Response) => {
  const dbStatus = getDbStatus();
  res.json({
    service: 'user-service',
    port: PORT,
    status: dbStatus.isConnected ? 'UP' : 'DEGRADED',
    uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
    database: dbStatus,
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// Validation Schemas
const registerSchema = z.object({
  name: z.string().min(2, 'Name must have at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must have at least 6 characters'),
  phone: z.string().optional(),
  role: z.enum(['CUSTOMER', 'ADMIN', 'DELIVERY_PARTNER'] as const).optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// Register
app.post(
  '/api/v1/auth/register',
  validateBody(registerSchema),
  async (req: Request, res: Response, next) => {
    try {
      const { name, email, password, phone, role } = req.body;
      const existingUser = await UserModel.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        throw new ConflictError('User with this email already exists');
      }

      const passwordHash = await hashPassword(password);
      const user = await UserModel.create({
        name,
        email: email.toLowerCase(),
        passwordHash,
        phone,
        role: role || 'CUSTOMER',
      });

      const userDto: IUser = {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role as UserRole,
        createdAt: user.createdAt.toISOString(),
      };

      const token = signToken({
        userId: userDto.id,
        email: userDto.email,
        name: userDto.name,
        role: userDto.role,
      });

      logger.info(`User registered successfully: ${userDto.email} [${userDto.role}]`);

      const response: ApiResponse<{ user: IUser; token: string }> = {
        success: true,
        message: 'User registered successfully',
        data: { user: userDto, token },
      };
      res.status(201).json(response);
    } catch (err) {
      next(err);
    }
  }
);

// Login
app.post(
  '/api/v1/auth/login',
  validateBody(loginSchema),
  async (req: Request, res: Response, next) => {
    try {
      const { email, password } = req.body;
      const user = await UserModel.findOne({ email: email.toLowerCase() });
      if (!user) {
        throw new UnauthorizedError('Invalid email or password');
      }

      const isMatch = await comparePassword(password, user.passwordHash);
      if (!isMatch) {
        throw new UnauthorizedError('Invalid email or password');
      }

      const userDto: IUser = {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role as UserRole,
        createdAt: user.createdAt.toISOString(),
      };

      const token = signToken({
        userId: userDto.id,
        email: userDto.email,
        name: userDto.name,
        role: userDto.role,
      });

      logger.info(`User logged in: ${userDto.email}`);

      const response: ApiResponse<{ user: IUser; token: string }> = {
        success: true,
        message: 'Login successful',
        data: { user: userDto, token },
      };
      res.json(response);
    } catch (err) {
      next(err);
    }
  }
);

// Me
app.get('/api/v1/auth/me', authenticateToken, async (req: Request, res: Response, next) => {
  try {
    if (!req.user) {
      throw new UnauthorizedError();
    }

    const user = await UserModel.findById(req.user.userId);
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    const userDto: IUser = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role as UserRole,
      createdAt: user.createdAt.toISOString(),
    };

    const response: ApiResponse<IUser> = {
      success: true,
      message: 'Current user profile retrieved',
      data: userDto,
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
});

// Delivery Partners Lookup
app.get('/api/v1/users/delivery-partners', async (_req: Request, res: Response, next) => {
  try {
    const partners = await UserModel.find({ role: 'DELIVERY_PARTNER' }).select('-passwordHash');
    const dtoList: IUser[] = partners.map((p) => ({
      id: p._id.toString(),
      name: p.name,
      email: p.email,
      phone: p.phone,
      role: p.role as UserRole,
      createdAt: p.createdAt.toISOString(),
    }));

    const response: ApiResponse<IUser[]> = {
      success: true,
      message: 'Delivery partners retrieved',
      data: dtoList,
    };
    res.json(response);
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
      logger.info(`UserService running on port ${PORT}`);
    });
  } catch (err) {
    logger.error(`Failed to start UserService: ${(err as Error).message}`);
    process.exit(1);
  }
};

if (process.env.NODE_ENV !== 'test') {
  start();
}

export { app };
