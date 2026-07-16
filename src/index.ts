import './config/env'; // Load env vars first
import express from 'express';
import cors from 'cors';
import path from 'path';
import swaggerUi from 'swagger-ui-express';

import { env } from './config/env';
import { swaggerSpec } from './config/swagger';
import logger from './lib/logger';
import { httpLogger } from './middleware/httpLogger';
import { errorHandler, notFound } from './middleware/errorHandler';

// Route modules
import authRoutes      from './modules/auth/auth.routes';
import pagesRoutes     from './modules/pages/pages.routes';
import mediaRoutes     from './modules/media/media.routes';
import clientsRoutes   from './modules/clients/clients.routes';
import onboardingRoutes from './modules/clients/onboarding.routes';
import portalRoutes    from './modules/clients/portal.routes';
import projectsRoutes  from './modules/projects/projects.routes';

const app = express();

// ─── Global Middleware ─────────────────────────────────────────────────────────
app.use(
  cors({
    origin:         '*',
    methods:        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── HTTP Request Logging ─────────────────────────────────────────────────────
app.use(httpLogger);

// ─── Static Files ──────────────────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// ─── Swagger Docs ─────────────────────────────────────────────────────────────
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle:  'Clover CMS API Docs',
  swaggerOptions:   { persistAuthorization: true },
}));
app.get('/docs.json', (_req, res) => res.json(swaggerSpec));

// ─── Health Check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    success:     true,
    message:     'Clover CMS API is running',
    timestamp:   new Date().toISOString(),
    environment: env.NODE_ENV,
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth',        authRoutes);
app.use('/api/pages',       pagesRoutes);
app.use('/api/media',       mediaRoutes);
app.use('/api/clients',     clientsRoutes);
app.use('/api/onboarding',  onboardingRoutes);
app.use('/api/portal',      portalRoutes);
app.use('/api/projects',    projectsRoutes);

// ─── 404 & Error Handlers ─────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(env.PORT, () => {
  logger.info('Server started', {
    url:         env.BASE_URL,
    docs:        `${env.BASE_URL}/docs`,
    environment: env.NODE_ENV,
    port:        env.PORT,
  });
});

// ─── Unhandled Rejections & Exceptions ────────────────────────────────────────
process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled promise rejection', { reason });
});

process.on('uncaughtException', (err: Error) => {
  logger.error('Uncaught exception — shutting down', {
    message: err.message,
    stack:   err.stack,
  });
  process.exit(1);
});

export default app;
