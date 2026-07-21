import './config/env';
import express from 'express';
import cors from 'cors';
import path from 'path';
import swaggerUi from 'swagger-ui-express';

import { env } from './config/env';
import { swaggerSpec } from './config/swagger';
import logger from './lib/logger';
import { httpLogger } from './middleware/httpLogger';
import { errorHandler, notFound } from './middleware/errorHandler';

// ── Core modules ──────────────────────────────────────────────────────────────
import authRoutes    from './modules/auth/auth.routes';
import pagesRoutes   from './modules/pages/pages.routes';
import mediaRoutes   from './modules/media/media.routes';
import clientsRoutes from './modules/clients/clients.routes';
import portalRoutes  from './modules/clients/portal.routes';
import projectsRoutes from './modules/projects/projects.routes';

// ── Invoices ──────────────────────────────────────────────────────────────────
import invoiceProjectRoutes    from './modules/invoices/invoices.routes';
import invoiceStandaloneRoutes from './modules/invoices/invoices.standalone.routes';

// ── Deliverables ──────────────────────────────────────────────────────────────
import {
  adminDeliverableRouter,
  adminDeliverableStandaloneRouter,
  portalDeliverableRouter,
  portalDeliverableReviewRouter,
} from './modules/deliverables/deliverables.routes';

// ── Revision requests ─────────────────────────────────────────────────────────
import {
  adminRevisionRouter,
  portalRevisionRouter,
  portalRevisionListRouter,
} from './modules/revisions/revisions.routes';

const app = express();

// ─── Global Middleware ────────────────────────────────────────────────────────
app.use(cors({
  origin:         '*',
  methods:        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(httpLogger);

// ─── Static Files ─────────────────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// ─── Swagger Docs ─────────────────────────────────────────────────────────────
// Use CDN-hosted assets so Swagger UI works on read-only/serverless filesystems
// where node_modules/swagger-ui-dist may not be accessible at runtime.
const SWAGGER_UI_VERSION = '5.18.2';
const SWAGGER_CDN = `https://unpkg.com/swagger-ui-dist@${SWAGGER_UI_VERSION}`;

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'Clover CMS API Docs',
  swaggerOptions:  { persistAuthorization: true },
  customCssUrl:    `${SWAGGER_CDN}/swagger-ui.css`,
  customJs:        [
    `${SWAGGER_CDN}/swagger-ui-bundle.js`,
    `${SWAGGER_CDN}/swagger-ui-standalone-preset.js`,
  ],
}));
app.get('/docs.json', (_req, res) => res.json(swaggerSpec));

// ─── Root ─────────────────────────────────────────────────────────────────────
app.get('/', (_req, res) => res.redirect('/health'));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ success: true, message: 'Clover CMS API is running', timestamp: new Date().toISOString(), environment: env.NODE_ENV });
});

// ─── Admin API ────────────────────────────────────────────────────────────────
app.use('/api/auth',              authRoutes);
app.use('/api/pages',             pagesRoutes);
app.use('/api/media',             mediaRoutes);
app.use('/api/clients',           clientsRoutes);
app.use('/api/projects',          projectsRoutes);

// Invoices: nested under projects + standalone
app.use('/api/projects/:id/invoices', invoiceProjectRoutes);
app.use('/api/invoices',              invoiceStandaloneRoutes);

// Deliverables: nested under projects + standalone
app.use('/api/projects/:id/deliverables', adminDeliverableRouter);
app.use('/api/deliverables',              adminDeliverableStandaloneRouter);

// Revision requests (admin queue)
app.use('/api/revision-requests', adminRevisionRouter);

// ─── Client Portal ────────────────────────────────────────────────────────────
app.use('/api/portal',                                    portalRoutes);
app.use('/api/portal/projects/:id/deliverables',          portalDeliverableRouter);
app.use('/api/portal/deliverables',                       portalDeliverableReviewRouter);
app.use('/api/portal/projects/:id/revision-requests',     portalRevisionRouter);
app.use('/api/portal/revision-requests',                  portalRevisionListRouter);

// ─── 404 & Error Handlers ────────────────────────────────────────────────────
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

process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled promise rejection', { reason });
});

process.on('uncaughtException', (err: Error) => {
  logger.error('Uncaught exception — shutting down', { message: err.message, stack: err.stack });
  process.exit(1);
});

export default app;
