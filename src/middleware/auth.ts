import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { sendError } from '../utils/response';

export interface AdminAuthRequest extends Request {
  admin?: { adminId: string; role: 'admin' };
}

export interface ClientAuthRequest extends Request {
  client?: { clientId: string; role: 'client' };
}

export const requireAdmin = (
  req: AdminAuthRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      sendError(res, 'Authorization token required', 401);
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, env.JWT_SECRET) as {
      adminId: string;
      role: string;
    };

    if (decoded.role !== 'admin') {
      sendError(res, 'Access denied: admin only', 403);
      return;
    }

    req.admin = { adminId: decoded.adminId, role: 'admin' };
    next();
  } catch (err) {
    sendError(res, 'Invalid or expired token', 401);
  }
};

export const requireClient = (
  req: ClientAuthRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      sendError(res, 'Authorization token required', 401);
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, env.JWT_SECRET) as {
      clientId: string;
      role: string;
    };

    if (decoded.role !== 'client') {
      sendError(res, 'Access denied: client only', 403);
      return;
    }

    req.client = { clientId: decoded.clientId, role: 'client' };
    next();
  } catch (err) {
    sendError(res, 'Invalid or expired token', 401);
  }
};

export const signAdminToken = (adminId: string): string => {
  return jwt.sign({ adminId, role: 'admin' }, env.JWT_SECRET, {
    expiresIn: '7d',
  });
};

export const signClientToken = (clientId: string): string => {
  return jwt.sign({ clientId, role: 'client' }, env.JWT_SECRET, {
    expiresIn: '7d',
  });
};
