// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Schema = Record<string, any>;

const adminAuth  = { AdminBearer: [] };
const clientAuth = { ClientBearer: [] };

// ─── Response helpers ─────────────────────────────────────────────────────────

const success = (dataSchema: Schema) => ({
  description: 'Success',
  content: {
    'application/json': {
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string' },
          data:    dataSchema,
        },
      },
    },
  },
});

const err = (description: string) => ({
  description,
  content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
});

// ─── Spec ─────────────────────────────────────────────────────────────────────

export const swaggerSpec: Schema = {
  openapi: '3.0.3',
  info: {
    title:   'Clover CMS API',
    version: '3.0.0',
    description: [
      'REST API for the Clover agency platform.',
      '',
      '**Authentication schemes:**',
      '',
      '**AdminBearer** — JWT obtained after a two-step login:',
      '1. `POST /api/auth/login` — validates password, emails a 6-digit OTP',
      '2. `POST /api/auth/verify-otp` — validates OTP, returns a 7-day JWT',
      '',
      'New admin accounts must also verify their email before they can sign in (`POST /api/auth/register` → link in email → `GET /api/auth/verify-email?token=...`).',
      '',
      '**ClientBearer** — opaque 30-day session token issued by `POST /api/portal/verify-otp`. Stored in the database; logging out invalidates it immediately.',
      '',
      'Pass either token in the `Authorization: Bearer <token>` header.',
    ].join('\n'),
    contact: { name: 'Patrick Oguamanam', email: 'kachioguamanam@gmail.com' },
  },
  servers: [
    { url: process.env.BASE_URL || 'http://localhost:3000', description: process.env.NODE_ENV === 'production' ? 'Production' : 'Local development' },
  ],

  tags: [
    { name: 'Health',             description: 'Server health check' },
    { name: 'Admin Auth',         description: 'Admin login and session (JWT)' },
    { name: 'Admin Management',   description: 'Admin user management — super admin only' },
    { name: 'Pages',              description: 'CMS page management — admin only' },
    { name: 'Content Blocks',     description: 'Page content blocks — admin only' },
    { name: 'Media',              description: 'Media library and file uploads — admin only' },
    { name: 'Clients',            description: 'Client records — admin only' },
    { name: 'Projects',           description: 'Project management — admin only' },
    { name: 'Milestones',         description: 'Project milestones — admin only' },
    { name: 'Project Updates',    description: 'Internal project updates — admin only' },
    { name: 'Project Assignments', description: 'Which admins are assigned to a project — scopes the admin dashboard and notifications feed' },
    { name: 'Invoices',           description: 'Invoice lifecycle with PDF generation — admin only' },
    { name: 'Deliverables',       description: 'Deliverable uploads and versioning — admin only' },
    { name: 'Revision Requests',  description: 'Client revision request queue — admin only' },
    { name: 'Notifications',      description: 'Server-generated attention feed for the admin header bell — admin only' },
    { name: 'Portal Auth',        description: 'Client portal — passwordless OTP authentication' },
    { name: 'Portal',             description: 'Client portal — profile, projects, deliverables, revisions' },
  ],

  components: {
    securitySchemes: {
      AdminBearer: {
        type: 'http', scheme: 'bearer', bearerFormat: 'JWT',
        description: 'Admin JWT — obtained after 2-step login (`POST /api/auth/login` → `POST /api/auth/verify-otp`). Valid for 7 days. The JWT encodes the admin\'s role (`ADMIN` or `SUPER_ADMIN`). Super-admin-only endpoints return 403 for regular admins.',
      },
      ClientBearer: {
        type: 'http', scheme: 'bearer', bearerFormat: 'opaque',
        description: 'Client session token — obtained from `POST /api/portal/verify-otp`. Valid for 30 days. Stored in the database; logging out invalidates it immediately.',
      },
    },

    schemas: {
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string',  example: 'Something went wrong' },
        },
      },

      Admin: {
        type: 'object',
        properties: {
          id:            { type: 'string' },
          name:          { type: 'string' },
          email:         { type: 'string', format: 'email' },
          role:          { type: 'string', enum: ['SUPER_ADMIN', 'ADMIN'] },
          emailVerified: { type: 'boolean', description: 'Must be true before the admin can sign in' },
          approved:      { type: 'boolean', description: 'Must be true (set by super admin) before the admin can sign in' },
          createdAt:     { type: 'string', format: 'date-time' },
          updatedAt:     { type: 'string', format: 'date-time' },
        },
      },

      Client: {
        type: 'object',
        properties: {
          id:        { type: 'string' },
          name:      { type: 'string' },
          email:     { type: 'string', format: 'email' },
          phone:     { type: 'string', nullable: true },
          company:   { type: 'string', nullable: true },
          status:    { type: 'string', enum: ['LEAD','ONBOARDING','ACTIVE','ON_HOLD','CHURNED'] },
          notes:     { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },

      Page: {
        type: 'object',
        properties: {
          id:          { type: 'string' },
          slug:        { type: 'string', example: 'about-us' },
          title:       { type: 'string' },
          description: { type: 'string', nullable: true },
          metaTitle:   { type: 'string', nullable: true },
          metaDesc:    { type: 'string', nullable: true },
          isPublished: { type: 'boolean' },
          blocks:      { type: 'array', items: { $ref: '#/components/schemas/PageBlock' } },
          createdAt:   { type: 'string', format: 'date-time' },
          updatedAt:   { type: 'string', format: 'date-time' },
        },
      },

      PageBlock: {
        type: 'object',
        properties: {
          id:        { type: 'string' },
          pageId:    { type: 'string' },
          type:      { type: 'string', enum: ['HEADING','TEXT','IMAGE','VIDEO','BUTTON','DIVIDER','EMBED','SPACER','COLUMNS'] },
          order:     { type: 'integer' },
          content:   { type: 'object', description: 'Block content — shape varies by type', example: { text: 'Welcome', level: 1 } },
          styles:    { type: 'object', description: 'CSS-like styling overrides',           example: { color: '#1a1a1a', fontSize: '32px' } },
          isVisible: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },

      Media: {
        type: 'object',
        properties: {
          id:           { type: 'string' },
          filename:     { type: 'string' },
          originalName: { type: 'string' },
          url:          { type: 'string', example: '/uploads/1720000000000-photo.jpg' },
          type:         { type: 'string', enum: ['IMAGE','VIDEO','DOCUMENT'] },
          mimeType:     { type: 'string', example: 'image/jpeg' },
          size:         { type: 'integer', description: 'File size in bytes' },
          createdAt:    { type: 'string', format: 'date-time' },
        },
      },

      Project: {
        type: 'object',
        properties: {
          id:              { type: 'string' },
          clientId:        { type: 'string' },
          parentProjectId: { type: 'string', nullable: true, description: 'Set when this project is a revision of another' },
          name:            { type: 'string' },
          type:            { type: 'string', nullable: true },
          description:     { type: 'string', nullable: true },
          phase:           { type: 'string', nullable: true, example: 'Design' },
          status:          { type: 'string', enum: ['PLANNING','IN_PROGRESS','REVIEW','COMPLETED','ON_HOLD','CANCELLED'] },
          progress:        { type: 'integer', minimum: 0, maximum: 100 },
          currency:        { type: 'string', example: 'USD' },
          totalValue:      { type: 'number', nullable: true },
          budget:          { type: 'number', nullable: true },
          startDate:       { type: 'string', format: 'date-time', nullable: true },
          endDate:         { type: 'string', format: 'date-time', nullable: true },
          archived:        { type: 'boolean' },
          notes:           { type: 'string', nullable: true },
          assignedAdmins: {
            type: 'array',
            description: 'Admins assigned to this project — determines who sees it on GET /api/projects and gets notified about it. Empty unless explicitly assigned via POST /api/projects/{id}/assignments.',
            items: { $ref: '#/components/schemas/Admin' },
          },
          createdAt:       { type: 'string', format: 'date-time' },
          updatedAt:       { type: 'string', format: 'date-time' },
        },
      },

      Milestone: {
        type: 'object',
        properties: {
          id:          { type: 'string' },
          projectId:   { type: 'string' },
          title:       { type: 'string' },
          description: { type: 'string', nullable: true },
          status:      { type: 'string', enum: ['PENDING','IN_PROGRESS','COMPLETED'] },
          order:       { type: 'integer' },
          dueDate:     { type: 'string', format: 'date-time', nullable: true },
          phase:       { type: 'string', nullable: true, example: 'Design', description: 'Free-text phase label — mirrors Project.phase, used to group milestones on a timeline' },
          completedAt: { type: 'string', format: 'date-time', nullable: true },
          createdAt:   { type: 'string', format: 'date-time' },
          updatedAt:   { type: 'string', format: 'date-time' },
        },
      },

      ProjectUpdate: {
        type: 'object',
        properties: {
          id:        { type: 'string' },
          projectId: { type: 'string' },
          title:     { type: 'string' },
          content:   { type: 'string' },
          isVisible: { type: 'boolean', description: 'Whether the client can see this update in the portal' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },

      Invoice: {
        type: 'object',
        properties: {
          id:            { type: 'string' },
          projectId:     { type: 'string' },
          invoiceNumber: { type: 'string', example: 'INV-0001' },
          amount:        { type: 'number', example: 2500 },
          currency:      { type: 'string', example: 'USD' },
          lineItems: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                description: { type: 'string' },
                quantity:    { type: 'number' },
                unitPrice:   { type: 'number' },
              },
            },
          },
          description: { type: 'string', nullable: true },
          status:      { type: 'string', enum: ['DRAFT','SENT','PAID','OVERDUE'] },
          issuedDate:  { type: 'string', format: 'date-time' },
          dueDate:     { type: 'string', format: 'date-time' },
          paidDate:    { type: 'string', format: 'date-time', nullable: true },
          pdfUrl:      { type: 'string', nullable: true, example: '/uploads/invoices/invoice-INV-0001.pdf' },
          createdAt:   { type: 'string', format: 'date-time' },
          updatedAt:   { type: 'string', format: 'date-time' },
        },
      },

      Deliverable: {
        type: 'object',
        properties: {
          id:           { type: 'string' },
          projectId:    { type: 'string' },
          milestoneId:  { type: 'string', nullable: true },
          title:        { type: 'string' },
          description:  { type: 'string', nullable: true },
          version:      { type: 'integer', example: 1, description: 'Auto-incremented when a new version is uploaded under the same title' },
          fileUrl:      { type: 'string', nullable: true },
          externalLink: { type: 'string', nullable: true, example: 'https://figma.com/file/...' },
          status:       { type: 'string', enum: ['READY','SUPERSEDED'] },
          review: {
            nullable:    true,
            description: "The client's latest review of this version — only populated on client portal reads (GET /api/portal/projects/{id}/deliverables and GET /api/portal/deliverables)",
            allOf:       [{ $ref: '#/components/schemas/DeliverableReview' }],
          },
          uploadedAt:   { type: 'string', format: 'date-time' },
          createdAt:    { type: 'string', format: 'date-time' },
          updatedAt:    { type: 'string', format: 'date-time' },
        },
      },

      DeliverableReview: {
        type: 'object',
        properties: {
          id:            { type: 'string' },
          deliverableId: { type: 'string' },
          status:        { type: 'string', enum: ['APPROVED','CHANGES_REQUESTED'] },
          comment:       { type: 'string', nullable: true },
          reviewedAt:    { type: 'string', format: 'date-time' },
          createdAt:     { type: 'string', format: 'date-time' },
        },
      },

      RevisionRequest: {
        type: 'object',
        properties: {
          id:                 { type: 'string' },
          projectId:          { type: 'string' },
          clientId:           { type: 'string' },
          description:        { type: 'string' },
          targetTimeframe:    { type: 'string', nullable: true },
          attachments: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                url:  { type: 'string' },
                name: { type: 'string' },
              },
            },
          },
          deliverableId:      { type: 'string', nullable: true, description: 'Set when this request was raised from a deliverable "request changes" review — a deliberate promotion, not automatic' },
          status:             { type: 'string', enum: ['REQUESTED','IN_REVIEW','APPROVED','DECLINED'] },
          resultingProjectId: { type: 'string', nullable: true, description: 'Set on approval — the new project for `new_project`, or the parent project itself for `new_phase` (symmetric across both approval types)' },
          decisionNote:       { type: 'string', nullable: true, description: 'Reason shown to the client for the terminal decision — e.g. a decline reason, or a note attached to an approval' },
          resultingPhaseNote: { type: 'string', nullable: true, deprecated: true, description: 'Deprecated — prefer `decisionNote`. No longer written on new approvals.' },
          createdAt:          { type: 'string', format: 'date-time' },
          updatedAt:          { type: 'string', format: 'date-time' },
        },
      },

      Notification: {
        type: 'object',
        properties: {
          id:         { type: 'string' },
          type:       { type: 'string', enum: ['INVOICE_OVERDUE','REVISION_REQUESTED','DELIVERABLE_REVIEW','MILESTONE_DUE'] },
          title:      { type: 'string', example: 'Invoice overdue' },
          body:       { type: 'string', nullable: true, example: 'Acme Co · $4,200 · 3 days late' },
          href:       { type: 'string', nullable: true, description: 'In-app deep link the bell navigates to on click', example: '/admin/invoices/inv_123' },
          entityType: { type: 'string', nullable: true, enum: ['invoice','revision','deliverable','milestone','project'] },
          entityId:   { type: 'string', nullable: true },
          read:       { type: 'boolean', description: 'Whether the calling admin has read this notification' },
          createdAt:  { type: 'string', format: 'date-time' },
        },
      },
    },
  },

  // ── Parameters ──────────────────────────────────────────────────────────────
  // Inline for clarity

  paths: {

    // ── Health ──────────────────────────────────────────────────────────────
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        responses: {
          200: {
            description: 'API is running',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success:     { type: 'boolean' },
                    message:     { type: 'string' },
                    timestamp:   { type: 'string', format: 'date-time' },
                    environment: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },

    // ── Admin Auth ──────────────────────────────────────────────────────────
    '/api/auth/register': {
      post: {
        tags: ['Admin Auth'],
        summary: 'Step 1 of registration — create account and send verification email',
        description: 'Creates an unverified admin account and sends a 24-hour verification link to the provided email. The admin cannot sign in until the email is verified.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object', required: ['name','email','password'],
                properties: {
                  name:     { type: 'string', example: 'Patrick Oguamanam' },
                  email:    { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 8 },
                },
              },
            },
          },
        },
        responses: {
          201: success({
            type: 'object',
            properties: { message: { type: 'string', example: 'Account created. Please check your email to verify your account.' } },
          }),
          409: err('Email already in use'),
        },
      },
    },

    '/api/auth/verify-email': {
      get: {
        tags: ['Admin Auth'],
        summary: 'Step 2 of registration — verify email via link',
        description: 'Called when the admin clicks the link in their verification email. Returns a JWT on success so the admin is immediately signed in.',
        parameters: [{ name: 'token', in: 'query', required: true, schema: { type: 'string' }, description: '64-char hex token from the verification email' }],
        responses: {
          200: success({
            type: 'object',
            properties: {
              token: { type: 'string', description: '7-day admin JWT' },
              admin: { $ref: '#/components/schemas/Admin' },
            },
          }),
          400: err('Invalid or expired verification link'),
        },
      },
      post: {
        tags: ['Admin Auth'],
        summary: 'Step 2 of registration — verify email via body (programmatic clients)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object', required: ['token'],
                properties: { token: { type: 'string' } },
              },
            },
          },
        },
        responses: {
          200: success({
            type: 'object',
            properties: {
              token: { type: 'string', description: '7-day admin JWT' },
              admin: { $ref: '#/components/schemas/Admin' },
            },
          }),
          400: err('Invalid or expired verification link'),
        },
      },
    },

    '/api/auth/login': {
      post: {
        tags: ['Admin Auth'],
        summary: 'Step 1 of login — validate password and send OTP',
        description: 'Validates the admin password. If correct, a 6-digit OTP is emailed (valid for 10 minutes). Submit the OTP to `POST /api/auth/verify-otp` to receive a JWT. The admin must have verified their email before they can sign in.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object', required: ['email','password'],
                properties: {
                  email:    { type: 'string', format: 'email' },
                  password: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: success({
            type: 'object',
            properties: { message: { type: 'string', example: 'A verification code has been sent to your email' } },
          }),
          401: err('Invalid credentials or email not verified'),
        },
      },
    },

    '/api/auth/verify-otp': {
      post: {
        tags: ['Admin Auth'],
        summary: 'Step 2 of login — validate OTP and receive JWT',
        description: 'Validates the 6-digit OTP that was emailed during `POST /api/auth/login`. Returns a 7-day JWT on success. The OTP is single-use.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object', required: ['email','otp'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  otp:   { type: 'string', minLength: 6, maxLength: 6, example: '382914' },
                },
              },
            },
          },
        },
        responses: {
          200: success({
            type: 'object',
            properties: {
              token: { type: 'string', description: '7-day admin JWT' },
              admin: { $ref: '#/components/schemas/Admin' },
            },
          }),
          401: err('Invalid or expired OTP'),
        },
      },
    },

    '/api/auth/me': {
      get: {
        tags: ['Admin Auth'],
        summary: 'Get authenticated admin profile',
        security: [adminAuth],
        responses: {
          200: success({ $ref: '#/components/schemas/Admin' }),
          401: err('Unauthorized'),
        },
      },
    },

    // ── Admin Management ─────────────────────────────────────────────────────
    '/api/admins': {
      get: {
        tags: ['Admin Management'],
        summary: 'List all admin accounts',
        description: 'Returns all admin accounts regardless of status. Super admin only.',
        security: [adminAuth],
        responses: {
          200: success({ type: 'array', items: { $ref: '#/components/schemas/Admin' } }),
          403: err('Super admin access required'),
        },
      },
    },

    '/api/admins/{id}': {
      get: {
        tags: ['Admin Management'],
        summary: 'Get a single admin account',
        security: [adminAuth],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: success({ $ref: '#/components/schemas/Admin' }),
          404: err('Admin not found'),
        },
      },
      delete: {
        tags: ['Admin Management'],
        summary: 'Delete an admin account',
        description: 'Cannot delete your own account or another super admin.',
        security: [adminAuth],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: success({ type: 'null' }),
          400: err('Cannot delete your own account or a super admin'),
          404: err('Admin not found'),
        },
      },
    },

    '/api/admins/{id}/approve': {
      post: {
        tags: ['Admin Management'],
        summary: 'Approve a pending admin account',
        description: 'Sets `approved: true`, allowing the admin to sign in. The admin is notified by email. Cannot approve your own account.',
        security: [adminAuth],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: success({ $ref: '#/components/schemas/Admin' }),
          400: err('Cannot approve your own account'),
          404: err('Admin not found'),
          409: err('Admin is already approved'),
        },
      },
    },

    '/api/admins/{id}/revoke': {
      post: {
        tags: ['Admin Management'],
        summary: 'Revoke an admin\'s access',
        description: 'Sets `approved: false`, preventing the admin from signing in. Cannot revoke your own account or a super admin.',
        security: [adminAuth],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: success({ $ref: '#/components/schemas/Admin' }),
          400: err('Cannot revoke your own account or a super admin'),
          404: err('Admin not found'),
        },
      },
    },

    '/api/admins/{id}/role': {
      put: {
        tags: ['Admin Management'],
        summary: 'Change an admin\'s role',
        description: 'Promote to SUPER_ADMIN or demote to ADMIN. Cannot change your own role.',
        security: [adminAuth],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object', required: ['role'],
                properties: {
                  role: { type: 'string', enum: ['SUPER_ADMIN', 'ADMIN'] },
                },
              },
            },
          },
        },
        responses: {
          200: success({ $ref: '#/components/schemas/Admin' }),
          400: err('Cannot change your own role'),
          404: err('Admin not found'),
        },
      },
    },

    // ── Pages ────────────────────────────────────────────────────────────────
    '/api/pages/slug/{slug}': {
      get: {
        tags: ['Pages'],
        summary: 'Get a published page by slug — public',
        parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: success({ $ref: '#/components/schemas/Page' }),
          404: err('Page not found or not published'),
        },
      },
    },

    '/api/pages': {
      get: {
        tags: ['Pages'],
        summary: 'List all pages',
        security: [adminAuth],
        responses: {
          200: success({ type: 'array', items: { $ref: '#/components/schemas/Page' } }),
          401: err('Unauthorized'),
        },
      },
      post: {
        tags: ['Pages'],
        summary: 'Create a page',
        security: [adminAuth],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object', required: ['slug','title'],
                properties: {
                  slug:        { type: 'string', example: 'about-us', description: 'Lowercase alphanumeric with hyphens' },
                  title:       { type: 'string', example: 'About Us' },
                  description: { type: 'string' },
                  metaTitle:   { type: 'string' },
                  metaDesc:    { type: 'string' },
                  isPublished: { type: 'boolean', default: false },
                },
              },
            },
          },
        },
        responses: {
          201: success({ $ref: '#/components/schemas/Page' }),
          409: err('Slug already in use'),
        },
      },
    },

    '/api/pages/{id}': {
      get: {
        tags: ['Pages'],
        summary: 'Get a page with all blocks',
        security: [adminAuth],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: success({ $ref: '#/components/schemas/Page' }),
          404: err('Page not found'),
        },
      },
      put: {
        tags: ['Pages'],
        summary: 'Update page metadata. Setting isPublished to true triggers a Vercel rebuild if VERCEL_DEPLOY_HOOK_URL is configured.',
        security: [adminAuth],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  slug:        { type: 'string' },
                  title:       { type: 'string' },
                  description: { type: 'string' },
                  metaTitle:   { type: 'string' },
                  metaDesc:    { type: 'string' },
                  isPublished: { type: 'boolean' },
                },
              },
            },
          },
        },
        responses: {
          200: success({ $ref: '#/components/schemas/Page' }),
          404: err('Page not found'),
          409: err('Slug already in use'),
        },
      },
      delete: {
        tags: ['Pages'],
        summary: 'Delete a page and all its blocks',
        security: [adminAuth],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: success({ type: 'null' }),
          404: err('Page not found'),
        },
      },
    },

    // ── Content Blocks ───────────────────────────────────────────────────────
    '/api/pages/{id}/blocks': {
      post: {
        tags: ['Content Blocks'],
        summary: 'Add a content block to a page',
        security: [adminAuth],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object', required: ['type','content'],
                properties: {
                  type: {
                    type: 'string',
                    enum: ['HEADING','TEXT','IMAGE','VIDEO','BUTTON','DIVIDER','EMBED','SPACER','COLUMNS'],
                  },
                  content: {
                    type: 'object',
                    description: 'Shape by type — HEADING: `{text,level}`, TEXT: `{text}`, IMAGE: `{src,alt,href?}`, VIDEO: `{src,poster?}`, BUTTON: `{label,href,target?}`, EMBED: `{embed_url}`, SPACER: `{height}`, COLUMNS: `{columns:[{blocks:[]}]}`',
                    example: { text: 'Welcome to Clover', level: 1 },
                  },
                  styles:    { type: 'object', example: { color: '#fff', fontSize: '36px' } },
                  isVisible: { type: 'boolean', default: true },
                  order:     { type: 'integer', description: 'Auto-appended to end of page if omitted' },
                },
              },
            },
          },
        },
        responses: {
          201: success({ $ref: '#/components/schemas/PageBlock' }),
          404: err('Page not found'),
        },
      },
    },

    '/api/pages/{id}/blocks/reorder': {
      put: {
        tags: ['Content Blocks'],
        summary: 'Reorder all blocks on a page in one request',
        security: [adminAuth],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object', required: ['blocks'],
                properties: {
                  blocks: {
                    type: 'array',
                    items: {
                      type: 'object', required: ['id','order'],
                      properties: {
                        id:    { type: 'string' },
                        order: { type: 'integer' },
                      },
                    },
                    example: [{ id: 'block_a', order: 0 }, { id: 'block_b', order: 1 }],
                  },
                },
              },
            },
          },
        },
        responses: {
          200: success({ $ref: '#/components/schemas/Page' }),
          404: err('Page not found'),
        },
      },
    },

    '/api/pages/{id}/blocks/{blockId}': {
      put: {
        tags: ['Content Blocks'],
        summary: 'Update a content block',
        security: [adminAuth],
        parameters: [
          { name: 'id',      in: 'path', required: true, schema: { type: 'string' } },
          { name: 'blockId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  content:   { type: 'object' },
                  styles:    { type: 'object' },
                  isVisible: { type: 'boolean' },
                  order:     { type: 'integer' },
                },
              },
            },
          },
        },
        responses: {
          200: success({ $ref: '#/components/schemas/PageBlock' }),
          404: err('Block not found'),
        },
      },
      delete: {
        tags: ['Content Blocks'],
        summary: 'Delete a content block',
        security: [adminAuth],
        parameters: [
          { name: 'id',      in: 'path', required: true, schema: { type: 'string' } },
          { name: 'blockId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: success({ type: 'null' }),
          404: err('Block not found'),
        },
      },
    },

    // ── Media ────────────────────────────────────────────────────────────────
    '/api/media/upload': {
      post: {
        tags: ['Media'],
        summary: 'Upload a file',
        description: 'Images (JPEG, PNG, GIF, WebP, SVG) up to 10 MB. Videos (MP4, MOV, WebM) up to 100 MB. Files are stored under `/uploads/` and served as static assets.',
        security: [adminAuth],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object', required: ['file'],
                properties: { file: { type: 'string', format: 'binary' } },
              },
            },
          },
        },
        responses: {
          201: success({ $ref: '#/components/schemas/Media' }),
          400: err('Unsupported file type or size exceeded'),
          401: err('Unauthorized'),
        },
      },
    },

    '/api/media': {
      get: {
        tags: ['Media'],
        summary: 'List all media files',
        security: [adminAuth],
        responses: {
          200: success({ type: 'array', items: { $ref: '#/components/schemas/Media' } }),
          401: err('Unauthorized'),
        },
      },
    },

    '/api/media/{id}': {
      delete: {
        tags: ['Media'],
        summary: 'Delete a media file — removes from disk and database',
        security: [adminAuth],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: success({ type: 'null' }),
          404: err('Media not found'),
        },
      },
    },

    // ── Clients ──────────────────────────────────────────────────────────────
    '/api/clients': {
      get: {
        tags: ['Clients'],
        summary: 'List all clients with project counts',
        security: [adminAuth],
        responses: {
          200: success({ type: 'array', items: { $ref: '#/components/schemas/Client' } }),
          401: err('Unauthorized'),
        },
      },
      post: {
        tags: ['Clients'],
        summary: 'Create a client record',
        security: [adminAuth],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object', required: ['name','email'],
                properties: {
                  name:    { type: 'string', example: 'Acme Corporation' },
                  email:   { type: 'string', format: 'email', example: 'hello@acme.com' },
                  phone:   { type: 'string' },
                  company: { type: 'string' },
                  notes:   { type: 'string' },
                  status:  { type: 'string', enum: ['LEAD','ONBOARDING','ACTIVE','ON_HOLD','CHURNED'], default: 'LEAD' },
                },
              },
            },
          },
        },
        responses: {
          201: success({ $ref: '#/components/schemas/Client' }),
          409: err('Email already exists'),
        },
      },
    },

    '/api/clients/{id}': {
      get: {
        tags: ['Clients'],
        summary: 'Get a client with all their projects',
        security: [adminAuth],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: success({ $ref: '#/components/schemas/Client' }),
          404: err('Client not found'),
        },
      },
      put: {
        tags: ['Clients'],
        summary: 'Update a client record',
        security: [adminAuth],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name:    { type: 'string' },
                  email:   { type: 'string', format: 'email' },
                  phone:   { type: 'string' },
                  company: { type: 'string' },
                  notes:   { type: 'string' },
                  status:  { type: 'string', enum: ['LEAD','ONBOARDING','ACTIVE','ON_HOLD','CHURNED'] },
                },
              },
            },
          },
        },
        responses: {
          200: success({ $ref: '#/components/schemas/Client' }),
          404: err('Client not found'),
          409: err('Email already exists'),
        },
      },
      delete: {
        tags: ['Clients'],
        summary: 'Delete a client and cascade-delete all their projects',
        security: [adminAuth],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: success({ type: 'null' }),
          404: err('Client not found'),
        },
      },
    },

    '/api/clients/{id}/send-portal-invite': {
      post: {
        tags: ['Clients'],
        summary: 'Send a portal invite email to the client',
        description: 'Marks the client as ACTIVE and sends a branded invite email with the portal URL. The client then signs in via the passwordless OTP flow.',
        security: [adminAuth],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: success({
            type: 'object',
            properties: { portalUrl: { type: 'string', example: 'http://localhost:3000/portal' } },
          }),
          404: err('Client not found'),
        },
      },
    },

    // ── Projects ─────────────────────────────────────────────────────────────
    '/api/projects': {
      get: {
        tags: ['Projects'],
        summary: 'List projects — scoped to the calling admin',
        description: 'A SUPER_ADMIN sees every project. A regular ADMIN only sees projects they are assigned to (see the Project Assignments endpoints) — this is what powers the admin dashboard. An admin with no assignments sees an empty list.',
        security: [adminAuth],
        responses: {
          200: success({ type: 'array', items: { $ref: '#/components/schemas/Project' } }),
          401: err('Unauthorized'),
        },
      },
      post: {
        tags: ['Projects'],
        summary: 'Create a project for a client',
        description: 'Creates the project and emails the client a project welcome notification with a portal link.',
        security: [adminAuth],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object', required: ['clientId','name'],
                properties: {
                  clientId:        { type: 'string' },
                  name:            { type: 'string', example: 'Website Redesign' },
                  type:            { type: 'string', example: 'Website' },
                  description:     { type: 'string' },
                  phase:           { type: 'string', example: 'Discovery' },
                  status:          { type: 'string', enum: ['PLANNING','IN_PROGRESS','REVIEW','COMPLETED','ON_HOLD','CANCELLED'], default: 'PLANNING' },
                  progress:        { type: 'integer', minimum: 0, maximum: 100, default: 0 },
                  currency:        { type: 'string', example: 'USD', default: 'USD' },
                  totalValue:      { type: 'number', example: 12000 },
                  budget:          { type: 'number' },
                  startDate:       { type: 'string', format: 'date-time' },
                  endDate:         { type: 'string', format: 'date-time' },
                  archived:        { type: 'boolean', default: false },
                  notes:           { type: 'string' },
                  parentProjectId: { type: 'string', description: 'Set to link this project as a revision of an existing one' },
                },
              },
            },
          },
        },
        responses: {
          201: success({ $ref: '#/components/schemas/Project' }),
          404: err('Client not found'),
        },
      },
    },

    '/api/projects/{id}': {
      get: {
        tags: ['Projects'],
        summary: 'Get a project with milestones, updates, invoices, deliverables, and assigned admins',
        description: 'Not scoped by assignment — any authenticated admin can look up a project directly by id, regardless of whether they appear in `assignedAdmins`. Only the list endpoint (`GET /api/projects`) is filtered.',
        security: [adminAuth],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: success({ $ref: '#/components/schemas/Project' }),
          404: err('Project not found'),
        },
      },
      put: {
        tags: ['Projects'],
        summary: 'Update a project',
        description: 'If the `status` field changes, the client is automatically notified by email.',
        security: [adminAuth],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name:        { type: 'string' },
                  type:        { type: 'string' },
                  description: { type: 'string' },
                  phase:       { type: 'string' },
                  status:      { type: 'string', enum: ['PLANNING','IN_PROGRESS','REVIEW','COMPLETED','ON_HOLD','CANCELLED'] },
                  progress:    { type: 'integer', minimum: 0, maximum: 100 },
                  currency:    { type: 'string' },
                  totalValue:  { type: 'number' },
                  budget:      { type: 'number' },
                  startDate:   { type: 'string', format: 'date-time' },
                  endDate:     { type: 'string', format: 'date-time' },
                  archived:    { type: 'boolean' },
                  notes:       { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: success({ $ref: '#/components/schemas/Project' }),
          404: err('Project not found'),
        },
      },
      delete: {
        tags: ['Projects'],
        summary: 'Delete a project — cascades to milestones, updates, invoices, deliverables',
        security: [adminAuth],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: success({ type: 'null' }),
          404: err('Project not found'),
        },
      },
    },

    // ── Milestones ───────────────────────────────────────────────────────────
    '/api/projects/{id}/milestones': {
      get: {
        tags: ['Milestones'],
        summary: 'List milestones for a project, ordered ascending',
        security: [adminAuth],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: success({ type: 'array', items: { $ref: '#/components/schemas/Milestone' } }),
          404: err('Project not found'),
        },
      },
      post: {
        tags: ['Milestones'],
        summary: 'Add a milestone to a project',
        security: [adminAuth],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object', required: ['title','order'],
                properties: {
                  title:       { type: 'string', example: 'Design handoff' },
                  description: { type: 'string' },
                  status:      { type: 'string', enum: ['PENDING','IN_PROGRESS','COMPLETED'], default: 'PENDING' },
                  order:       { type: 'integer' },
                  dueDate:     { type: 'string', format: 'date-time' },
                  phase:       { type: 'string', example: 'Design' },
                },
              },
            },
          },
        },
        responses: {
          201: success({ $ref: '#/components/schemas/Milestone' }),
          404: err('Project not found'),
        },
      },
    },

    '/api/projects/{id}/milestones/{milestoneId}': {
      put: {
        tags: ['Milestones'],
        summary: 'Update a milestone',
        description: 'Setting `status` to `COMPLETED` auto-records `completedAt` and emails the client a milestone completion notification.',
        security: [adminAuth],
        parameters: [
          { name: 'id',          in: 'path', required: true, schema: { type: 'string' } },
          { name: 'milestoneId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  title:       { type: 'string' },
                  description: { type: 'string' },
                  status:      { type: 'string', enum: ['PENDING','IN_PROGRESS','COMPLETED'] },
                  order:       { type: 'integer' },
                  dueDate:     { type: 'string', format: 'date-time' },
                  phase:       { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: success({ $ref: '#/components/schemas/Milestone' }),
          404: err('Milestone not found'),
        },
      },
      delete: {
        tags: ['Milestones'],
        summary: 'Delete a milestone',
        security: [adminAuth],
        parameters: [
          { name: 'id',          in: 'path', required: true, schema: { type: 'string' } },
          { name: 'milestoneId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: success({ type: 'null' }),
          404: err('Milestone not found'),
        },
      },
    },

    // ── Project Updates ──────────────────────────────────────────────────────
    '/api/projects/{id}/updates': {
      get: {
        tags: ['Project Updates'],
        summary: 'List all updates for a project (internal and visible), newest first',
        security: [adminAuth],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: success({ type: 'array', items: { $ref: '#/components/schemas/ProjectUpdate' } }),
          404: err('Project not found'),
        },
      },
      post: {
        tags: ['Project Updates'],
        summary: 'Post a project update',
        description: 'Set `isVisible: true` to show the update in the client portal — the client is also notified by email. `isVisible: false` keeps it internal (no email sent).',
        security: [adminAuth],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object', required: ['title','content'],
                properties: {
                  title:     { type: 'string', example: 'Design phase complete' },
                  content:   { type: 'string', example: 'All wireframes have been approved.' },
                  isVisible: { type: 'boolean', default: true },
                },
              },
            },
          },
        },
        responses: {
          201: success({ $ref: '#/components/schemas/ProjectUpdate' }),
          404: err('Project not found'),
        },
      },
    },

    '/api/projects/{id}/updates/{updateId}': {
      delete: {
        tags: ['Project Updates'],
        summary: 'Delete a project update',
        security: [adminAuth],
        parameters: [
          { name: 'id',       in: 'path', required: true, schema: { type: 'string' } },
          { name: 'updateId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: success({ type: 'null' }),
          404: err('Update not found'),
        },
      },
    },

    // ── Project Assignments ──────────────────────────────────────────────────
    '/api/projects/{id}/assignments': {
      post: {
        tags: ['Project Assignments'],
        summary: 'Assign an admin to a project',
        description: 'Once assigned, the project appears on that admin\'s `GET /api/projects` (dashboard) and they receive notifications about it. Has no effect on SUPER_ADMIN visibility — they see every project regardless of assignment.',
        security: [adminAuth],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object', required: ['adminId'],
                properties: { adminId: { type: 'string' } },
              },
            },
          },
        },
        responses: {
          201: success({ type: 'array', items: { $ref: '#/components/schemas/Admin' }, description: 'The project\'s full list of assigned admins after the change' }),
          404: err('Project not found / Admin not found'),
          409: err('Admin is already assigned to this project'),
        },
      },
    },

    '/api/projects/{id}/assignments/{adminId}': {
      delete: {
        tags: ['Project Assignments'],
        summary: 'Unassign an admin from a project',
        security: [adminAuth],
        parameters: [
          { name: 'id',      in: 'path', required: true, schema: { type: 'string' } },
          { name: 'adminId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: success({ type: 'array', items: { $ref: '#/components/schemas/Admin' }, description: 'The project\'s full list of assigned admins after the change' }),
          404: err('Admin is not assigned to this project'),
        },
      },
    },

    // ── Invoices (nested) ────────────────────────────────────────────────────
    '/api/projects/{id}/invoices': {
      get: {
        tags: ['Invoices'],
        summary: 'List all invoices for a project',
        security: [adminAuth],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: success({ type: 'array', items: { $ref: '#/components/schemas/Invoice' } }),
          404: err('Project not found'),
        },
      },
      post: {
        tags: ['Invoices'],
        summary: 'Create a draft invoice for a project',
        description: 'Invoice number is auto-generated (`INV-0001`, `INV-0002`, …). Currency defaults to the project currency if not provided.',
        security: [adminAuth],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object', required: ['amount','dueDate'],
                properties: {
                  amount:      { type: 'number', example: 2500 },
                  currency:    { type: 'string', example: 'USD', description: 'Defaults to project currency' },
                  description: { type: 'string' },
                  lineItems: {
                    type: 'array',
                    items: {
                      type: 'object', required: ['description','quantity','unitPrice'],
                      properties: {
                        description: { type: 'string' },
                        quantity:    { type: 'number' },
                        unitPrice:   { type: 'number' },
                      },
                    },
                  },
                  dueDate:    { type: 'string', format: 'date-time' },
                  issuedDate: { type: 'string', format: 'date-time', description: 'Defaults to now' },
                },
              },
            },
          },
        },
        responses: {
          201: success({ $ref: '#/components/schemas/Invoice' }),
          404: err('Project not found'),
        },
      },
    },

    // ── Invoices (standalone) ────────────────────────────────────────────────
    '/api/invoices/{id}': {
      get: {
        tags: ['Invoices'],
        summary: 'Get a single invoice',
        security: [adminAuth],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: success({ $ref: '#/components/schemas/Invoice' }),
          404: err('Invoice not found'),
        },
      },
      put: {
        tags: ['Invoices'],
        summary: 'Edit an invoice — only allowed while status is DRAFT',
        security: [adminAuth],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  amount:      { type: 'number' },
                  currency:    { type: 'string' },
                  description: { type: 'string' },
                  lineItems:   { type: 'array', items: { type: 'object' } },
                  dueDate:     { type: 'string', format: 'date-time' },
                  issuedDate:  { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
        responses: {
          200: success({ $ref: '#/components/schemas/Invoice' }),
          404: err('Invoice not found'),
          409: err('Only draft invoices can be edited'),
        },
      },
      delete: {
        tags: ['Invoices'],
        summary: 'Delete an invoice — not allowed if status is PAID',
        security: [adminAuth],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: success({ type: 'null' }),
          404: err('Invoice not found'),
          409: err('Paid invoices cannot be deleted'),
        },
      },
    },

    '/api/invoices/{id}/send': {
      post: {
        tags: ['Invoices'],
        summary: 'Send invoice to client — generates PDF, emails it, sets status to SENT',
        security: [adminAuth],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: success({ $ref: '#/components/schemas/Invoice' }),
          404: err('Invoice not found'),
          409: err('Invoice is already paid'),
        },
      },
    },

    '/api/invoices/{id}/mark-paid': {
      post: {
        tags: ['Invoices'],
        summary: 'Mark an invoice as paid — records paidDate',
        security: [adminAuth],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: success({ $ref: '#/components/schemas/Invoice' }),
          404: err('Invoice not found'),
          409: err('Invoice is already paid'),
        },
      },
    },

    '/api/invoices/{id}/mark-overdue': {
      post: {
        tags: ['Invoices'],
        summary: 'Mark an invoice as overdue',
        security: [adminAuth],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: success({ $ref: '#/components/schemas/Invoice' }),
          404: err('Invoice not found'),
          409: err('Invoice is already paid'),
        },
      },
    },

    '/api/invoices/{id}/pdf/preview': {
      get: {
        tags: ['Invoices'],
        summary: 'Preview the invoice PDF inline',
        description: 'Returns the PDF with `Content-Disposition: inline` so it renders directly in the browser instead of downloading. If the invoice has not been sent yet (no PDF generated so far, e.g. still DRAFT), the PDF is generated on the fly from the invoice\'s current data — this does not mark the invoice as sent or persist a `pdfUrl`. If a PDF already exists (the invoice was sent), that file is reused as-is.',
        security: [adminAuth],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'The invoice PDF', content: { 'application/pdf': { schema: { type: 'string', format: 'binary' } } } },
          404: err('Invoice not found'),
        },
      },
    },

    '/api/invoices/{id}/pdf/download': {
      get: {
        tags: ['Invoices'],
        summary: 'Download the invoice PDF',
        description: 'Same PDF resolution as the preview endpoint, but returned with `Content-Disposition: attachment` to trigger a download as `Invoice-{invoiceNumber}.pdf`.',
        security: [adminAuth],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'The invoice PDF', content: { 'application/pdf': { schema: { type: 'string', format: 'binary' } } } },
          404: err('Invoice not found'),
        },
      },
    },

    // ── Deliverables (nested) ────────────────────────────────────────────────
    '/api/projects/{id}/deliverables': {
      get: {
        tags: ['Deliverables'],
        summary: 'List all deliverables for a project (all versions)',
        security: [adminAuth],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: success({ type: 'array', items: { $ref: '#/components/schemas/Deliverable' } }),
          404: err('Project not found'),
        },
      },
      post: {
        tags: ['Deliverables'],
        summary: 'Upload a new deliverable',
        description: 'If a deliverable with the same `title` already exists, the version number is incremented and previous versions are marked SUPERSEDED. The client is notified by email.',
        security: [adminAuth],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                description: 'Provide either fileUrl or externalLink — at least one is required.',
                properties: {
                  title:        { type: 'string', example: 'Homepage Mockup' },
                  description:  { type: 'string' },
                  fileUrl:      { type: 'string', example: '/uploads/mockup-v1.pdf' },
                  externalLink: { type: 'string', example: 'https://figma.com/file/...' },
                  milestoneId:  { type: 'string', description: 'Optionally link to a milestone' },
                },
              },
            },
          },
        },
        responses: {
          201: success({ $ref: '#/components/schemas/Deliverable' }),
          400: err('Either fileUrl or externalLink is required'),
          404: err('Project not found'),
        },
      },
    },

    // ── Deliverables (standalone) ────────────────────────────────────────────
    '/api/deliverables/{id}': {
      put: {
        tags: ['Deliverables'],
        summary: 'Update deliverable metadata',
        security: [adminAuth],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  title:        { type: 'string' },
                  description:  { type: 'string' },
                  fileUrl:      { type: 'string' },
                  externalLink: { type: 'string' },
                  milestoneId:  { type: 'string', nullable: true },
                },
              },
            },
          },
        },
        responses: {
          200: success({ $ref: '#/components/schemas/Deliverable' }),
          404: err('Deliverable not found'),
        },
      },
      delete: {
        tags: ['Deliverables'],
        summary: 'Delete a deliverable',
        security: [adminAuth],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: success({ type: 'null' }),
          404: err('Deliverable not found'),
        },
      },
    },

    // ── Revision Requests (admin) ────────────────────────────────────────────
    '/api/revision-requests': {
      get: {
        tags: ['Revision Requests'],
        summary: 'List all revision requests — admin queue',
        security: [adminAuth],
        responses: {
          200: success({ type: 'array', items: { $ref: '#/components/schemas/RevisionRequest' } }),
          401: err('Unauthorized'),
        },
      },
    },

    '/api/revision-requests/{id}': {
      get: {
        tags: ['Revision Requests'],
        summary: 'Get a single revision request',
        security: [adminAuth],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: success({ $ref: '#/components/schemas/RevisionRequest' }),
          404: err('Revision request not found'),
        },
      },
    },

    '/api/revision-requests/{id}/status': {
      put: {
        tags: ['Revision Requests'],
        summary: 'Update status (IN_REVIEW or DECLINED) — notifies client by email',
        description: 'To approve with substance (scaffolding a new project or phase), use `POST /api/revision-requests/{id}/approve` instead. `decisionNote` is included in the client-facing status update email — use it to explain a decline.',
        security: [adminAuth],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object', required: ['status'],
                properties: {
                  status:       { type: 'string', enum: ['IN_REVIEW','APPROVED','DECLINED'] },
                  decisionNote: { type: 'string', description: 'Reason shown to the client — e.g. why the request was declined' },
                },
              },
            },
          },
        },
        responses: {
          200: success({ $ref: '#/components/schemas/RevisionRequest' }),
          404: err('Revision request not found'),
        },
      },
    },

    '/api/revision-requests/{id}/approve': {
      post: {
        tags: ['Revision Requests'],
        summary: 'Approve a revision request',
        description: [
          'Two approval modes:',
          '- `new_project` — scaffolds a new Project linked to the original via `parentProjectId`. Requires `projectName`.',
          '- `new_phase` — the admin authors the phase inline: creates the given `milestones` on the *existing* project (tagged with `phase`, appended after the current max order), sets `Project.phase` to `phase`, and — if `endDate` is given and later than the current one — extends `Project.endDate`. `resultingProjectId` is set to the parent project itself, symmetric with `new_project`. Requires `phase` and at least one entry in `milestones`.',
          '',
          'Client is notified by email in both cases, including `decisionNote` if provided.',
        ].join('\n'),
        security: [adminAuth],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object', required: ['type'],
                properties: {
                  type:               { type: 'string', enum: ['new_project','new_phase'] },
                  projectName:        { type: 'string', description: 'Used when type is new_project' },
                  projectDescription: { type: 'string' },
                  phase:              { type: 'string', example: 'Phase 2 — Rollout', description: 'Required when type is new_phase — phase label written to the new milestones and to Project.phase' },
                  milestones: {
                    type: 'array',
                    description: 'Required when type is new_phase — at least one entry',
                    items: {
                      type: 'object', required: ['title'],
                      properties: {
                        title:   { type: 'string', example: 'Rollout kickoff' },
                        dueDate: { type: 'string', format: 'date-time' },
                      },
                    },
                    example: [
                      { title: 'Rollout kickoff', dueDate: '2026-10-01T00:00:00.000Z' },
                      { title: 'Go-live',         dueDate: '2026-11-15T00:00:00.000Z' },
                    ],
                  },
                  endDate:      { type: 'string', format: 'date-time', description: "Optional, new_phase only — extends the project's target finish. Ignored if earlier than the current endDate." },
                  decisionNote: { type: 'string', description: 'Note shown to the client alongside the approval' },
                },
              },
            },
          },
        },
        responses: {
          200: success({ $ref: '#/components/schemas/RevisionRequest' }),
          400: err('phase is required for new_phase approvals / At least one milestone is required for new_phase approvals'),
          404: err('Revision request not found'),
          409: err('Already approved'),
        },
      },
    },

    // ── Notifications ────────────────────────────────────────────────────────
    '/api/notifications': {
      get: {
        tags: ['Notifications'],
        summary: "List the calling admin's notifications, newest first",
        description: 'Capped at the 50 most recent. Scoped like the dashboard (see `GET /api/projects`): a SUPER_ADMIN gets notified about every project, a regular ADMIN only about projects they\'re assigned to. `INVOICE_OVERDUE` and `MILESTONE_DUE` are derived lazily on each call from current invoice/milestone state (there is no background scheduler); `REVISION_REQUESTED` and `DELIVERABLE_REVIEW` are created at the moment those events happen, for every admin in scope for that project. Intended to be polled roughly every 60s. There is no separate unread-count endpoint — derive it client-side from `data.filter(n => !n.read).length`.',
        security: [adminAuth],
        responses: {
          200: success({ type: 'array', items: { $ref: '#/components/schemas/Notification' } }),
          401: err('Unauthorized'),
        },
      },
    },

    '/api/notifications/{id}/read': {
      patch: {
        tags: ['Notifications'],
        summary: 'Mark one notification read (or unread)',
        description: '404s if the notification does not belong to the calling admin.',
        security: [adminAuth],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { read: { type: 'boolean', default: true, description: 'Pass false to mark unread again' } },
              },
            },
          },
        },
        responses: {
          200: success({ $ref: '#/components/schemas/Notification' }),
          404: err('Notification not found'),
        },
      },
    },

    '/api/notifications/read-all': {
      post: {
        tags: ['Notifications'],
        summary: "Mark all of the calling admin's notifications read",
        description: "Powers the dropdown's \"Mark all read\" action.",
        security: [adminAuth],
        responses: {
          200: success({
            type: 'object',
            properties: { updated: { type: 'integer', example: 4, description: 'Number of notifications flipped from unread to read' } },
          }),
          401: err('Unauthorized'),
        },
      },
    },

    // ── Portal Auth ──────────────────────────────────────────────────────────
    '/api/portal/request-otp': {
      post: {
        tags: ['Portal Auth'],
        summary: 'Request a one-time login code',
        description: 'A 6-digit OTP is emailed to the client. Valid for 10 minutes. The response is identical whether or not the email is registered — prevents enumeration.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object', required: ['email'],
                properties: { email: { type: 'string', format: 'email' } },
              },
            },
          },
        },
        responses: {
          200: success({
            type: 'object',
            properties: { message: { type: 'string', example: 'If that email is registered, a code has been sent' } },
          }),
        },
      },
    },

    '/api/portal/verify-otp': {
      post: {
        tags: ['Portal Auth'],
        summary: 'Submit OTP to receive a 30-day session token',
        description: 'Validates the OTP, creates a database-backed session, and returns a session token. Pass this token as `Authorization: Bearer <token>` on all subsequent portal requests.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object', required: ['email','code'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  code:  { type: 'string', minLength: 6, maxLength: 6, example: '481632' },
                },
              },
            },
          },
        },
        responses: {
          200: success({
            type: 'object',
            properties: {
              token:  { type: 'string', description: '30-day session token — store and use as Bearer token' },
              client: { $ref: '#/components/schemas/Client' },
            },
          }),
          401: err('Invalid or expired code'),
        },
      },
    },

    '/api/portal/logout': {
      post: {
        tags: ['Portal Auth'],
        summary: 'Invalidate the current session',
        security: [clientAuth],
        responses: {
          200: success({ type: 'null' }),
          401: err('Unauthorized'),
        },
      },
    },

    // ── Portal ───────────────────────────────────────────────────────────────
    '/api/portal/me': {
      get: {
        tags: ['Portal'],
        summary: 'Get authenticated client profile',
        security: [clientAuth],
        responses: {
          200: success({ $ref: '#/components/schemas/Client' }),
          401: err('Unauthorized'),
        },
      },
      put: {
        tags: ['Portal'],
        summary: 'Update client profile',
        security: [clientAuth],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name:    { type: 'string' },
                  email:   { type: 'string', format: 'email' },
                  phone:   { type: 'string' },
                  company: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: success({ $ref: '#/components/schemas/Client' }),
          409: err('Email already in use'),
        },
      },
    },

    '/api/portal/projects': {
      get: {
        tags: ['Portal'],
        summary: "List all of the client's projects",
        description: 'Includes milestones, visible updates, and non-draft invoices. Draft invoices are hidden from the client.',
        security: [clientAuth],
        responses: {
          200: success({ type: 'array', items: { $ref: '#/components/schemas/Project' } }),
          401: err('Unauthorized'),
        },
      },
    },

    '/api/portal/projects/{id}': {
      get: {
        tags: ['Portal'],
        summary: 'Get a single project',
        description: 'Returns milestones, visible updates, non-draft invoices, ready deliverables (with latest review), and revision requests. Returns 404 if the project belongs to a different client.',
        security: [clientAuth],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: success({ $ref: '#/components/schemas/Project' }),
          404: err('Project not found'),
        },
      },
    },

    '/api/portal/projects/{id}/deliverables': {
      get: {
        tags: ['Portal'],
        summary: "List ready deliverables on a project",
        description: "Each deliverable includes the client's own latest `review` on that version, so the portal can show \"You approved this\" / \"Changes requested\" durably instead of resetting on reload.",
        security: [clientAuth],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: success({ type: 'array', items: { $ref: '#/components/schemas/Deliverable' } }),
          404: err('Project not found'),
        },
      },
    },

    '/api/portal/projects/{id}/invoices': {
      get: {
        tags: ['Portal'],
        summary: "List a project's issued invoices",
        description: 'Excludes DRAFT invoices — drafts stay internal to the studio. Sorted by issuedDate desc.',
        security: [clientAuth],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: success({ type: 'array', items: { $ref: '#/components/schemas/Invoice' } }),
          404: err('Project not found'),
        },
      },
    },

    '/api/portal/deliverables': {
      get: {
        tags: ['Portal'],
        summary: "List READY deliverables across all of the client's projects",
        description: 'Collapses the per-project deliverable fan-out into a single request for the dashboard. Same item shape as the per-project read, including the embedded `review`.',
        security: [clientAuth],
        responses: {
          200: success({ type: 'array', items: { $ref: '#/components/schemas/Deliverable' } }),
          401: err('Unauthorized'),
        },
      },
    },

    '/api/portal/invoices': {
      get: {
        tags: ['Portal'],
        summary: "List issued invoices across all of the client's projects",
        description: 'Collapses the per-project invoice fan-out into a single request for the dashboard billing snapshot. Excludes DRAFT invoices.',
        security: [clientAuth],
        responses: {
          200: success({ type: 'array', items: { $ref: '#/components/schemas/Invoice' } }),
          401: err('Unauthorized'),
        },
      },
    },

    '/api/portal/deliverables/{id}/review': {
      post: {
        tags: ['Portal'],
        summary: 'Submit a review on a deliverable',
        description: 'Client approves or requests changes. Admin is notified by email. Only READY deliverables can be reviewed.',
        security: [clientAuth],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object', required: ['status'],
                properties: {
                  status:  { type: 'string', enum: ['APPROVED','CHANGES_REQUESTED'] },
                  comment: { type: 'string', description: 'Required when requesting changes' },
                },
              },
            },
          },
        },
        responses: {
          200: success({ $ref: '#/components/schemas/DeliverableReview' }),
          404: err('Deliverable not found'),
          409: err('Deliverable is not in READY status'),
        },
      },
    },

    '/api/portal/projects/{id}/revision-requests': {
      post: {
        tags: ['Portal'],
        summary: 'Submit a revision request on a project',
        description: 'Client describes what they need. Admin is notified by email and an in-app notification, and the client gets a "received" acknowledgement email; the request enters the revision queue. Pass `deliverableId` to promote a deliverable "request changes" review into a linked revision request — this is a deliberate, opt-in action taken by the client, not automatic.',
        security: [clientAuth],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object', required: ['description'],
                properties: {
                  description:     { type: 'string', example: 'We need an additional page for our new product line.' },
                  targetTimeframe: { type: 'string', example: 'Within 2 weeks' },
                  attachments: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        url:  { type: 'string' },
                        name: { type: 'string' },
                      },
                    },
                  },
                  deliverableId: { type: 'string', description: 'Optional — links this request to the deliverable it was raised from. Must belong to the same project.' },
                },
              },
            },
          },
        },
        responses: {
          201: success({ $ref: '#/components/schemas/RevisionRequest' }),
          404: err('Project not found / Deliverable not found'),
        },
      },
    },

    '/api/portal/revision-requests': {
      get: {
        tags: ['Portal'],
        summary: "List all of the client's revision requests",
        security: [clientAuth],
        responses: {
          200: success({ type: 'array', items: { $ref: '#/components/schemas/RevisionRequest' } }),
          401: err('Unauthorized'),
        },
      },
    },
  },
};
