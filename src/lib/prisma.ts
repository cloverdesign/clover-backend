import { PrismaClient, Prisma } from '@prisma/client';
import { createLogger } from './logger';

const log = createLogger('prisma');

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const isDev = process.env.NODE_ENV !== 'production';

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: isDev
      ? [
          { emit: 'event', level: 'query' },
          { emit: 'event', level: 'warn'  },
          { emit: 'event', level: 'error' },
        ]
      : [{ emit: 'event', level: 'error' }],
  });

// Route Prisma events through the winston logger
if (isDev) {
  (prisma as PrismaClient).$on('query' as never, (e: Prisma.QueryEvent) => {
    log.debug('Query', {
      query:    e.query,
      params:   e.params,
      duration: `${e.duration}ms`,
    });
  });

  (prisma as PrismaClient).$on('warn' as never, (e: Prisma.LogEvent) => {
    log.warn(e.message);
  });
}

(prisma as PrismaClient).$on('error' as never, (e: Prisma.LogEvent) => {
  log.error(e.message);
});

if (!isDev) {
  globalForPrisma.prisma = prisma;
}

export default prisma;
