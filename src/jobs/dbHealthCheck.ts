import cron from 'node-cron';
import prisma from '../lib/prisma';
import { mailer } from '../lib/mailer';
import { createLogger } from '../lib/logger';

const log = createLogger('db-health-check');

export async function runDbHealthCheck(): Promise<void> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    log.info('Database health check passed', { durationMs: Date.now() - start });
  } catch (err: any) {
    log.error('Database health check failed', { error: err.message });
    await mailer.sendDbHealthCheckFailed(err.message).catch(() => {});
  }
}

// Runs every morning at 8:00 server-local time.
export function scheduleDbHealthCheck(): void {
  cron.schedule('0 8 * * *', runDbHealthCheck);
  log.info('Database health check scheduled', { cron: '0 8 * * *' });
}
