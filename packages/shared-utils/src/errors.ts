import { Request, Response, NextFunction } from 'express';
import { ApiErrorResponse } from '@quickcommerce/shared-types';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode = 500, code = 'INTERNAL_SERVER_ERROR', details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', details?: unknown) {
    super(message, 404, 'NOT_FOUND', details);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request', details?: unknown) {
    super(message, 400, 'BAD_REQUEST', details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required', details?: unknown) {
    super(message, 401, 'UNAUTHORIZED', details);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access forbidden', details?: unknown) {
    super(message, 403, 'FORBIDDEN', details);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource conflict', details?: unknown) {
    super(message, 409, 'CONFLICT', details);
  }
}

export class InsufficientStockError extends AppError {
  constructor(message = 'Insufficient stock for requested item', details?: unknown) {
    super(message, 409, 'INSUFFICIENT_STOCK', details);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', details?: unknown) {
    super(message, 422, 'VALIDATION_ERROR', details);
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message = 'Service temporarily unavailable', details?: unknown) {
    super(message, 503, 'SERVICE_UNAVAILABLE', details);
  }
}

export const errorHandler = (
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof AppError) {
    const response: ApiErrorResponse = {
      success: false,
      message: err.message,
      error: {
        code: err.code,
        details: err.details,
      },
    };
    res.status(err.statusCode).json(response);
    return;
  }

  // Unhandled error
  console.error('[Unhandled Error]:', err);
  const response: ApiErrorResponse = {
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
    },
  };
  res.status(500).json(response);
};
