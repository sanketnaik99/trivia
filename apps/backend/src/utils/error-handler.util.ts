import { Request, Response, NextFunction } from 'express';

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

export class AppError extends Error {
  public code: string;
  public statusCode: number;
  public details?: any;

  constructor(code: string, message: string, statusCode: number = 500, details?: any) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.name = 'AppError';
  }
}

export function createErrorResponse(code: string, message: string, details?: any): ErrorResponse {
  return {
    error: {
      code,
      message,
      details
    }
  };
}

export function handleError(err: Error, req: Request, res: Response, next: NextFunction) {
  console.error('Error:', err);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json(createErrorResponse(err.code, err.message, err.details));
  }

  // Handle Prisma errors
  if (err.name === 'PrismaClientKnownRequestError') {
    const prismaError = err as any;
    switch (prismaError.code) {
      case 'P2002':
        return res.status(409).json(createErrorResponse('CONFLICT', 'A record with this information already exists'));
      case 'P2025':
        return res.status(404).json(createErrorResponse('NOT_FOUND', 'Record not found'));
      default:
        return res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'Database error'));
    }
  }

  // Handle validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json(createErrorResponse('VALIDATION_ERROR', err.message));
  }

  // Default error response
  res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'An unexpected error occurred'));
}

export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}