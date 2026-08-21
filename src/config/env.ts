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
  PORT:     parseInt(process.env.PORT || '3000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  BASE_URL:     process.env.BASE_URL     || 'http://localhost:3000',
  CORS_ORIGINS: process.env.CORS_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:5173',
  FRONTEND_URL: process.env.FRONTEND_URL || process.env.CORS_ORIGINS?.split(',')[0]?.trim() || 'http://localhost:5173',

  // Database
  DATABASE_URL: requireEnv('DATABASE_URL'),

  // Admin JWT
  JWT_SECRET: requireEnv('JWT_SECRET'),

  // SendGrid
  SENDGRID_API_KEY:   requireEnv('SENDGRID_API_KEY'),
  SENDGRID_FROM_EMAIL: requireEnv('SENDGRID_FROM_EMAIL'),
  SENDGRID_FROM_NAME:  process.env.SENDGRID_FROM_NAME || 'Clover Agency',

  // Admin contact — recipient for admin-facing notifications
  ADMIN_EMAIL: requireEnv('ADMIN_EMAIL'),

  // Vercel deploy hook (optional)
  VERCEL_DEPLOY_HOOK_URL: process.env.VERCEL_DEPLOY_HOOK_URL || '',
} as const;
