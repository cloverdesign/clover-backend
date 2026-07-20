import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

// ─── Log levels ───────────────────────────────────────────────────────────────
// error   — unhandled exceptions, fatal conditions
// warn    — recoverable issues, deprecations
// info    — significant lifecycle events (startup, shutdown, auth)
// http    — every inbound HTTP request/response
// debug   — verbose internal state, useful during development

const levels: Record<string, number> = {
  error: 0,
  warn:  1,
  info:  2,
  http:  3,
  debug: 4,
};

const colors: Record<string, string> = {
  error: 'red',
  warn:  'yellow',
  info:  'green',
  http:  'magenta',
  debug: 'cyan',
};

winston.addColors(colors);

// ─── Formats ──────────────────────────────────────────────────────────────────

// Pretty, coloured output for the developer console
const devConsoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    const metaStr =
      Object.keys(meta).length > 0
        ? `\n          ${JSON.stringify(meta, null, 2).replace(/\n/g, '\n          ')}`
        : '';
    const stackStr = stack ? `\n${stack}` : '';
    return `${timestamp}  ${level.padEnd(17)} ${message}${metaStr}${stackStr}`;
  })
);

// Structured JSON written to log files and used in production console output
const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// ─── Transports ───────────────────────────────────────────────────────────────

const isProd = process.env.NODE_ENV === 'production';
const isDev  = !isProd;

// Detect serverless / read-only filesystem environments.
// AWS Lambda runs from /var/task which is read-only; only /tmp is writable.
// Skip file transports entirely in these environments — logs surface via the
// platform's stdout collector (CloudWatch, Render, Railway, etc.).
const isReadOnlyFs =
  process.env.AWS_LAMBDA_FUNCTION_NAME !== undefined ||
  process.cwd().startsWith('/var/task');

function buildFileTransports(): winston.transport[] {
  if (isReadOnlyFs) return [];

  const LOGS_DIR = path.join(process.cwd(), 'logs');

  const defaults = {
    dirname:       LOGS_DIR,
    datePattern:   'YYYY-MM-DD',
    maxFiles:      '30d',
    maxSize:       '20m',
    zippedArchive: true,
    format:        jsonFormat,
  };

  const combined = new DailyRotateFile({
    ...defaults,
    filename: '%DATE%-combined.log',
    level:    'debug',
  });

  const errors = new DailyRotateFile({
    ...defaults,
    filename: '%DATE%-error.log',
    level:    'error',
  });

  combined.on('rotate', (oldFile, newFile) => {
    logger.info('Log file rotated', { oldFile, newFile });
  });

  return [combined, errors];
}

// ─── Logger ───────────────────────────────────────────────────────────────────

export const logger = winston.createLogger({
  // In serverless environments all levels reach the console so nothing is lost.
  // In production with file transports, only warnings/errors go to console.
  level:       'debug',
  levels,
  exitOnError: false,
  transports: [
    new winston.transports.Console({
      format: isDev ? devConsoleFormat : jsonFormat,
      level:  (isProd && !isReadOnlyFs) ? 'warn' : 'debug',
    }),
    ...buildFileTransports(),
  ],
});

// ─── Child logger factory ─────────────────────────────────────────────────────
// Usage: const log = createLogger('auth');  log.info('Login attempt', { email });
// Adds a "module" field to every log entry so you can filter by source.

export const createLogger = (module: string) =>
  logger.child({ module });

export default logger;
