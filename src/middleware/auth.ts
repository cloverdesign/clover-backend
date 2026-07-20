import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env';
import { sendError } from '../utils/response';
import prisma from '../lib/prisma';

// ─── Admin auth (JWT) ─────────────────────────────────────────────────────────

export interface AdminAuthRequest extends Request {
  admin?: { adminId: string; role: 'admin' };
}

export const requireAdmin = (
  req: AdminAuthRequest,
  res: Response,
  next: NextFunction,
): void => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      sendError(res, 'Authorization token required', 401);
      return;
    }

    const token   = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, env.JWT_SECRET) as { adminId: string; role: string };

    if (decoded.role !== 'admin') {
      sendError(res, 'Access denied: admin only', 403);
      return;
    }

    req.admin = { adminId: decoded.adminId, role: 'admin' };
    next();
  } catch {
    sendError(res, 'Invalid or expired token', 401);
  }
};

export const signAdminToken = (adminId: string): string =>
  jwt.sign({ adminId, role: 'admin' }, env.JWT_SECRET, { expiresIn: '7d' });

// ─── Client auth (DB session) ─────────────────────────────────────────────────

export interface ClientAuthRequest extends Request {
  client?:  { clientId: string };
  session?: { id: string };
}

export const requireClient = async (
  req: ClientAuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      sendError(res, 'Authorization token required', 401);
      return;
    }

    const token   = authHeader.split(' ')[1];
    const session = await prisma.authSession.findUnique({ where: { token } });

    if (!session) {
      sendError(res, 'Invalid session', 401);
      return;
    }

    if (session.expiresAt < new Date()) {
      await prisma.authSession.delete({ where: { id: session.id } });
      sendError(res, 'Session expired — please sign in again', 401);
      return;
    }

    req.client  = { clientId: session.clientId };
    req.session = { id: session.id };
    next();
  } catch {
    sendError(res, 'Authentication failed', 401);
  }
};

export const createClientSession = async (clientId: string): Promise<string> => {
  const token     = crypto.randomBytes(40).toString('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  await prisma.authSession.create({ data: { clientId, token, expiresAt } });
  return token;
};
