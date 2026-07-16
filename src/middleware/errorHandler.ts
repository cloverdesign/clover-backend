import { Request, Response, NextFunction } from 'express';
import logger from '../lib/logger';

export interface AppError extends Error {
  statusCode?: number;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const statusCode = err.statusCode || 500;
  const isServerError = statusCode >= 500;

  // 5xx errors are unexpected — log with full stack
  // 4xx errors are client mistakes — log at warn level without stack noise
  if (isServerError) {
    logger.error(err.message, {
      statusCode,
      method:  req.method,
      url:     req.originalUrl,
      ip:      req.ip,
      stack:   err.stack,
    });
  } else {
    logger.warn(err.message, {
      statusCode,
      method: req.method,
      url:    req.originalUrl,
    });
  }

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && isServerError && { stack: err.stack }),
  });
};

export const notFound = (req: Request, res: Response): void => {
  logger.warn('Route not found', { method: req.method, url: req.originalUrl });

  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
};
