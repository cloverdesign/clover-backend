import './config/env';
import express from 'express';
import cors from 'cors';
import path from 'path';

import { env } from './config/env';
import { swaggerSpec } from './config/swagger';
import logger from './lib/logger';
import { httpLogger } from './middleware/httpLogger';
import { errorHandler, notFound } from './middleware/errorHandler';

// ── Core modules ──────────────────────────────────────────────────────────────
import authRoutes    from './modules/auth/auth.routes';
import adminsRoutes  from './modules/admins/admins.routes';
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

// ─── API Docs (Scalar) ────────────────────────────────────────────────────────
app.get('/docs.json', (_req, res) => res.json(swaggerSpec));
app.get('/docs', (_req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Clover API Docs</title>
</head>
<body>
  <script
    id="api-reference"
    data-url="/docs.json"
    data-configuration='${JSON.stringify({
      theme: "default",
      darkMode: false,
      layout: "modern",
      showSidebar: true,
      searchHotKey: "k",
      defaultHttpClient: { targetKey: "javascript", clientKey: "fetch" },
      customCss: `
        :root {
          --scalar-color-1: #0f172a;
          --scalar-color-2: #475569;
          --scalar-color-3: #94a3b8;
          --scalar-color-accent: #2E7D52;
          --scalar-background-1: #ffffff;
          --scalar-background-2: #f8fafc;
          --scalar-background-3: #f1f5f9;
          --scalar-background-accent: #f0fdf4;
          --scalar-border-color: #e2e8f0;
          --scalar-sidebar-background-1: #0f172a;
          --scalar-sidebar-color-1: #f1f5f9;
          --scalar-sidebar-color-2: #94a3b8;
          --scalar-sidebar-color-active: #ffffff;
          --scalar-sidebar-background-active: #1e293b;
          --scalar-sidebar-border-color: #1e293b;
          --scalar-color-green: #16a34a;
          --scalar-color-red: #dc2626;
          --scalar-color-yellow: #d97706;
          --scalar-color-blue: #2563eb;
          --scalar-color-orange: #ea580c;
          --scalar-color-purple: #9333ea;
        }
      `,
    })}'>
  </script>
  <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
</body>
</html>`);
});


// ─── Root ─────────────────────────────────────────────────────────────────────
app.get('/', (_req, res) => res.redirect('/health'));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ success: true, message: 'Clover CMS API is running', timestamp: new Date().toISOString(), environment: env.NODE_ENV });
});

// ─── Admin API ────────────────────────────────────────────────────────────────
app.use('/api/auth',              authRoutes);
app.use('/api/admins',            adminsRoutes);
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
