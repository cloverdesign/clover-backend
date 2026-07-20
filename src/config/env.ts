import dotenv from 'dotenv';

dotenv.config();

const requireEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

export const env = {
  PORT:        parseInt(process.env.PORT || '3000', 10),
  NODE_ENV:    process.env.NODE_ENV || 'development',
  BASE_URL:    process.env.BASE_URL || 'http://localhost:3000',

  // Database
  DATABASE_URL: requireEnv('DATABASE_URL'),

  // Admin JWT (still used for admin panel)
  JWT_SECRET:  requireEnv('JWT_SECRET'),

  // Zoho SMTP
  ZOHO_EMAIL:     requireEnv('ZOHO_EMAIL'),
  ZOHO_PASSWORD:  requireEnv('ZOHO_PASSWORD'),
  ZOHO_FROM_NAME: process.env.ZOHO_FROM_NAME || 'Clover Agency',

  // Admin contact — used as reply-to / recipient for admin notifications
  ADMIN_EMAIL: requireEnv('ADMIN_EMAIL'),

  // Vercel deploy hook (optional — CMS publish won't trigger a build if unset)
  VERCEL_DEPLOY_HOOK_URL: process.env.VERCEL_DEPLOY_HOOK_URL || '',
} as const;
