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

const LOGS_DIR = path.join(process.cwd(), 'logs');
const isProd    = process.env.NODE_ENV === 'production';
const isDev     = !isProd;

const fileTransportDefaults = {
  dirname:        LOGS_DIR,
  datePattern:    'YYYY-MM-DD',
  maxFiles:       '30d',   // retain 30 days of logs
  maxSize:        '20m',   // rotate when a file hits 20 MB
  zippedArchive:  true,
  format:         jsonFormat,
};

// All logs at the active level and above
const combinedRotatingTransport = new DailyRotateFile({
  ...fileTransportDefaults,
  filename: '%DATE%-combined.log',
  level:    'debug',
});

// Error-only file — fast path for on-call triage
const errorRotatingTransport = new DailyRotateFile({
  ...fileTransportDefaults,
  filename: '%DATE%-error.log',
  level:    'error',
});

combinedRotatingTransport.on('rotate', (oldFile, newFile) => {
  logger.info('Log file rotated', { oldFile, newFile });
});

// ─── Logger ───────────────────────────────────────────────────────────────────

export const logger = winston.createLogger({
  // In production only log warn and above to console; debug/info go to files
  level:       isProd ? 'warn' : 'debug',
  levels,
  exitOnError: false,
  transports: [
    new winston.transports.Console({
      format: isDev ? devConsoleFormat : jsonFormat,
      // In production, only warnings and errors reach the console
      level:  isProd ? 'warn' : 'debug',
    }),
    combinedRotatingTransport,
    errorRotatingTransport,
  ],
});

// ─── Child logger factory ─────────────────────────────────────────────────────
// Usage: const log = createLogger('auth');  log.info('Login attempt', { email });
// Adds a "module" field to every log entry so you can filter by source.

export const createLogger = (module: string) =>
  logger.child({ module });

export default logger;
