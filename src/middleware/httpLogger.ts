import morgan, { StreamOptions } from 'morgan';
import { Request, Response } from 'express';
import logger from '../lib/logger';

// Stream morgan output through winston at the "http" level
const stream: StreamOptions = {
  write: (message: string) => logger.http(message.trimEnd()),
};

// Custom token: request body (sanitised — passwords are redacted)
morgan.token('body', (req: Request) => {
  const body = { ...(req.body as Record<string, unknown>) };
  const sensitiveKeys = ['password', 'currentPassword', 'newPassword', 'confirmPassword'];
  sensitiveKeys.forEach((key) => {
    if (key in body) body[key] = '[REDACTED]';
  });
  return Object.keys(body).length > 0 ? JSON.stringify(body) : '-';
});

// Custom token: requesting IP, accounting for proxies
morgan.token('client-ip', (req: Request) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return (Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0]).trim();
  return req.socket.remoteAddress ?? '-';
});

// Custom token: response content length with fallback
morgan.token('content-length-safe', (_req: Request, res: Response) => {
  return res.getHeader('content-length')?.toString() ?? '-';
});

// Development format: human-readable, includes body
const devFormat = [
  ':client-ip',
  ':method',
  ':url',
  'HTTP/:http-version',
  ':status',
  ':content-length-safe bytes',
  ':response-time ms',
  '| body: :body',
].join('  ');

// Production format: compact, no body
const prodFormat = [
  ':client-ip',
  ':method',
  ':url',
  'HTTP/:http-version',
  ':status',
  ':content-length-safe bytes',
  ':response-time ms',
].join('  ');

const format = process.env.NODE_ENV === 'production' ? prodFormat : devFormat;

export const httpLogger = morgan(format, { stream });
