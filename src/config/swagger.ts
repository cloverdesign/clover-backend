// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Schema = Record<string, any>;

const adminBearerAuth = { AdminBearer: [] };
const clientBearerAuth = { ClientBearer: [] };

// ─── Reusable response shapes ─────────────────────────────────────────────────
const success = (dataSchema: Schema) => ({
  description: 'Success',
  content: {
    'application/json': {
      schema: {
        type: 'object' as const,
        properties: {
          success: { type: 'boolean' as const, example: true },
          message: { type: 'string' as const },
          data: dataSchema,
        },
      },
    },
  },
});

const errorResp = (description: string) => ({
  description,
  content: {
    'application/json': {
      schema: { $ref: '#/components/schemas/ErrorResponse' },
    },
  },
});

// ─── Spec ──────────────────────────────────────────────────────────────────────
export const swaggerSpec: Schema = {
  openapi: '3.0.3',
  info: {
    title: 'Clover CMS API',
    version: '1.0.0',
    description:
      'Backend API for the Clover Content Management System. Covers page/content management, media uploads, client management, onboarding, client portal, and project tracking.',
    contact: {
      name: 'Patrick Oguamanam',
      email: 'kachioguamanam@gmail.com',
    },
  },
  servers: [
    { url: 'http://localhost:3000', description: 'Local development' },
  ],
  tags: [
    { name: 'Health', description: 'Server health check' },
    { name: 'Admin Auth', description: 'Admin authentication' },
    { name: 'Pages', description: 'Page and content block management (admin)' },
    { name: 'Media', description: 'File uploads and media library (admin)' },
    { name: 'Clients', description: 'Client management (admin)' },
    { name: 'Onboarding', description: 'Client onboarding flow (public)' },
    { name: 'Portal Auth', description: 'Client portal authentication' },
    { name: 'Portal', description: 'Client self-service portal' },
    { name: 'Projects', description: 'Project, milestone and update management (admin)' },
  ],
  components: {
    securitySchemes: {
      AdminBearer: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Admin JWT — obtained from POST /api/auth/login',
      },
      ClientBearer: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Client JWT — obtained from POST /api/portal/login',
      },
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Something went wrong' },
        },
      },
      Admin: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Page: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          slug: { type: 'string', example: 'about-us' },
          title: { type: 'string' },
          description: { type: 'string', nullable: true },
          metaTitle: { type: 'string', nullable: true },
          metaDesc: { type: 'string', nullable: true },
          isPublished: { type: 'boolean' },
          blocks: { type: 'array', items: { $ref: '#/components/schemas/PageBlock' } },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      PageBlock: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          pageId: { type: 'string' },
          type: {
            type: 'string',
            enum: ['HEADING', 'TEXT', 'IMAGE', 'VIDEO', 'BUTTON', 'DIVIDER', 'EMBED', 'SPACER', 'COLUMNS'],
          },
          order: { type: 'integer' },
          content: {
            type: 'object',
            description: 'Block content — shape varies by type',
            example: { text: 'Hello World', level: 1 },
          },
          styles: {
            type: 'object',
            description: 'CSS-like styling overrides',
            example: { color: '#1a1a1a', fontSize: '32px', textAlign: 'center' },
          },
          isVisible: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Media: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          filename: { type: 'string' },
          originalName: { type: 'string' },
          url: { type: 'string', example: '/uploads/1720000000000-photo.jpg' },
          type: { type: 'string', enum: ['IMAGE', 'VIDEO', 'DOCUMENT'] },
          mimeType: { type: 'string', example: 'image/jpeg' },
          size: { type: 'integer', description: 'File size in bytes' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Client: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          phone: { type: 'string', nullable: true },
          company: { type: 'string', nullable: true },
          status: {
            type: 'string',
            enum: ['LEAD', 'ONBOARDING', 'ACTIVE', 'ON_HOLD', 'CHURNED'],
          },
          notes: { type: 'string', nullable: true },
          onboardingCompletedAt: { type: 'string', format: 'date-time', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Project: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          clientId: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string', nullable: true },
          status: {
            type: 'string',
            enum: ['PLANNING', 'IN_PROGRESS', 'REVIEW', 'COMPLETED', 'ON_HOLD', 'CANCELLED'],
          },
          progress: { type: 'integer', minimum: 0, maximum: 100 },
          startDate: { type: 'string', format: 'date-time', nullable: true },
          endDate: { type: 'string', format: 'date-time', nullable: true },
          budget: { type: 'number', nullable: true },
          notes: { type: 'string', nullable: true },
          milestones: { type: 'array', items: { $ref: '#/components/schemas/Milestone' } },
          updates: { type: 'array', items: { $ref: '#/components/schemas/ProjectUpdate' } },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Milestone: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          projectId: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string', nullable: true },
          status: { type: 'string', enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED'] },
          order: { type: 'integer' },
          dueDate: { type: 'string', format: 'date-time', nullable: true },
          completedAt: { type: 'string', format: 'date-time', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      ProjectUpdate: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          projectId: { type: 'string' },
          title: { type: 'string' },
          content: { type: 'string' },
          isVisible: { type: 'boolean', description: 'Whether client can see this update' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  },

  paths: {
    // ── Health ─────────────────────────────────────────────────────────────────
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
                    success: { type: 'boolean' },
                    message: { type: 'string' },
                    timestamp: { type: 'string', format: 'date-time' },
                    environment: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },

    // ── Admin Auth ─────────────────────────────────────────────────────────────
    '/api/auth/register': {
      post: {
        tags: ['Admin Auth'],
        summary: 'Register admin account',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password'],
                properties: {
                  name: { type: 'string', example: 'Patrick Oguamanam' },
                  email: { type: 'string', format: 'email', example: 'admin@clover.com' },
                  password: { type: 'string', minLength: 8, example: 'secret123' },
                },
              },
            },
          },
        },
        responses: {
          201: success({ $ref: '#/components/schemas/Admin' }),
          400: errorResp('Validation error'),
          409: errorResp('Email already in use'),
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Admin Auth'],
        summary: 'Admin login',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: success({
            type: 'object',
            properties: {
              token: { type: 'string' },
              admin: { $ref: '#/components/schemas/Admin' },
            },
          }),
          401: errorResp('Invalid credentials'),
        },
      },
    },
    '/api/auth/me': {
      get: {
        tags: ['Admin Auth'],
        summary: 'Get current admin profile',
        security: [adminBearerAuth],
        responses: {
          200: success({ $ref: '#/components/schemas/Admin' }),
          401: errorResp('Unauthorized'),
        },
      },
    },

    // ── Pages ─────────────────────────────────────────────────────────────────
    '/api/pages/slug/{slug}': {
      get: {
        tags: ['Pages'],
        summary: 'Get published page by slug (public)',
        parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: success({ $ref: '#/components/schemas/Page' }),
          404: errorResp('Page not found or not published'),
        },
      },
    },
    '/api/pages': {
      get: {
        tags: ['Pages'],
        summary: 'List all pages',
        security: [adminBearerAuth],
        responses: {
          200: success({ type: 'array', items: { $ref: '#/components/schemas/Page' } }),
          401: errorResp('Unauthorized'),
        },
      },
      post: {
        tags: ['Pages'],
        summary: 'Create a new page',
        security: [adminBearerAuth],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['slug', 'title'],
                properties: {
                  slug: { type: 'string', example: 'about-us' },
                  title: { type: 'string', example: 'About Us' },
                  description: { type: 'string' },
                  metaTitle: { type: 'string' },
                  metaDesc: { type: 'string' },
                  isPublished: { type: 'boolean', default: false },
                },
              },
            },
          },
        },
        responses: {
          201: success({ $ref: '#/components/schemas/Page' }),
          400: errorResp('Validation error'),
          409: errorResp('Slug already in use'),
        },
      },
    },
    '/api/pages/{id}': {
      get: {
        tags: ['Pages'],
        summary: 'Get page with all blocks',
        security: [adminBearerAuth],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: success({ $ref: '#/components/schemas/Page' }),
          404: errorResp('Page not found'),
        },
      },
      put: {
        tags: ['Pages'],
        summary: 'Update page metadata',
        security: [adminBearerAuth],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  slug: { type: 'string' },
                  title: { type: 'string' },
                  description: { type: 'string' },
                  metaTitle: { type: 'string' },
                  metaDesc: { type: 'string' },
                  isPublished: { type: 'boolean' },
                },
              },
            },
          },
        },
        responses: {
          200: success({ $ref: '#/components/schemas/Page' }),
          404: errorResp('Page not found'),
        },
      },
      delete: {
        tags: ['Pages'],
        summary: 'Delete page and all its blocks',
        security: [adminBearerAuth],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: success({ type: 'null' }),
          404: errorResp('Page not found'),
        },
      },
    },
    '/api/pages/{id}/blocks': {
      post: {
        tags: ['Pages'],
        summary: 'Add a content block to a page',
        security: [adminBearerAuth],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['type', 'content'],
                properties: {
                  type: {
                    type: 'string',
                    enum: ['HEADING', 'TEXT', 'IMAGE', 'VIDEO', 'BUTTON', 'DIVIDER', 'EMBED', 'SPACER', 'COLUMNS'],
                  },
                  content: {
                    type: 'object',
                    description: 'Block content. Examples by type:\n- HEADING: `{ text, level }` (level 1-6)\n- TEXT: `{ text }`\n- IMAGE: `{ src, alt, href }`\n- VIDEO: `{ src, poster }`\n- BUTTON: `{ label, href, target }`\n- EMBED: `{ embed_url }`\n- SPACER: `{ height }`\n- COLUMNS: `{ columns: [{ blocks: [] }] }`',
                    example: { text: 'Welcome to Clover', level: 1 },
                  },
                  styles: {
                    type: 'object',
                    example: { color: '#fff', fontSize: '36px', textAlign: 'center' },
                  },
                  isVisible: { type: 'boolean', default: true },
                  order: { type: 'integer', description: 'Position in page. Auto-appended if omitted.' },
                },
              },
            },
          },
        },
        responses: {
          201: success({ $ref: '#/components/schemas/PageBlock' }),
          404: errorResp('Page not found'),
        },
      },
    },
    '/api/pages/{id}/blocks/reorder': {
      put: {
        tags: ['Pages'],
        summary: 'Reorder blocks on a page',
        security: [adminBearerAuth],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['blocks'],
                properties: {
                  blocks: {
                    type: 'array',
                    items: {
                      type: 'object',
                      required: ['id', 'order'],
                      properties: {
                        id: { type: 'string' },
                        order: { type: 'integer' },
                      },
                    },
                    example: [{ id: 'block_1', order: 0 }, { id: 'block_2', order: 1 }],
                  },
                },
              },
            },
          },
        },
        responses: {
          200: success({ type: 'null' }),
          400: errorResp('Validation error'),
        },
      },
    },
    '/api/pages/{id}/blocks/{blockId}': {
      put: {
        tags: ['Pages'],
        summary: 'Update a content block',
        security: [adminBearerAuth],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'blockId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  content: { type: 'object' },
                  styles: { type: 'object' },
                  isVisible: { type: 'boolean' },
                  order: { type: 'integer' },
                },
              },
            },
          },
        },
        responses: {
          200: success({ $ref: '#/components/schemas/PageBlock' }),
          404: errorResp('Block not found'),
        },
      },
      delete: {
        tags: ['Pages'],
        summary: 'Delete a content block',
        security: [adminBearerAuth],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'blockId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: success({ type: 'null' }),
          404: errorResp('Block not found'),
        },
      },
    },

    // ── Media ─────────────────────────────────────────────────────────────────
    '/api/media/upload': {
      post: {
        tags: ['Media'],
        summary: 'Upload a file',
        security: [adminBearerAuth],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['file'],
                properties: {
                  file: {
                    type: 'string',
                    format: 'binary',
                    description: 'Images (jpeg/png/gif/webp/svg, max 10 MB) or videos (mp4/mov/webm, max 100 MB)',
                  },
                },
              },
            },
          },
        },
        responses: {
          201: success({ $ref: '#/components/schemas/Media' }),
          400: errorResp('Invalid file type or size exceeded'),
          401: errorResp('Unauthorized'),
        },
      },
    },
    '/api/media': {
      get: {
        tags: ['Media'],
        summary: 'List all media files',
        security: [adminBearerAuth],
        responses: {
          200: success({ type: 'array', items: { $ref: '#/components/schemas/Media' } }),
          401: errorResp('Unauthorized'),
        },
      },
    },
    '/api/media/{id}': {
      delete: {
        tags: ['Media'],
        summary: 'Delete a media file',
        security: [adminBearerAuth],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: success({ type: 'null' }),
          404: errorResp('Media not found'),
        },
      },
    },

    // ── Clients ───────────────────────────────────────────────────────────────
    '/api/clients': {
      get: {
        tags: ['Clients'],
        summary: 'List all clients',
        security: [adminBearerAuth],
        responses: {
          200: success({ type: 'array', items: { $ref: '#/components/schemas/Client' } }),
          401: errorResp('Unauthorized'),
        },
      },
      post: {
        tags: ['Clients'],
        summary: 'Create a new client',
        security: [adminBearerAuth],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email'],
                properties: {
                  name: { type: 'string', example: 'Acme Corp' },
                  email: { type: 'string', format: 'email', example: 'hello@acme.com' },
                  phone: { type: 'string' },
                  company: { type: 'string' },
                  notes: { type: 'string' },
                  status: {
                    type: 'string',
                    enum: ['LEAD', 'ONBOARDING', 'ACTIVE', 'ON_HOLD', 'CHURNED'],
                    default: 'LEAD',
                  },
                },
              },
            },
          },
        },
        responses: {
          201: success({ $ref: '#/components/schemas/Client' }),
          409: errorResp('Email already exists'),
        },
      },
    },
    '/api/clients/{id}': {
      get: {
        tags: ['Clients'],
        summary: 'Get client with their projects',
        security: [adminBearerAuth],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: success({ $ref: '#/components/schemas/Client' }),
          404: errorResp('Client not found'),
        },
      },
      put: {
        tags: ['Clients'],
        summary: 'Update a client',
        security: [adminBearerAuth],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  email: { type: 'string', format: 'email' },
                  phone: { type: 'string' },
                  company: { type: 'string' },
                  notes: { type: 'string' },
                  status: { type: 'string', enum: ['LEAD', 'ONBOARDING', 'ACTIVE', 'ON_HOLD', 'CHURNED'] },
                },
              },
            },
          },
        },
        responses: {
          200: success({ $ref: '#/components/schemas/Client' }),
          404: errorResp('Client not found'),
          409: errorResp('Email already exists'),
        },
      },
      delete: {
        tags: ['Clients'],
        summary: 'Delete a client and all their projects',
        security: [adminBearerAuth],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: success({ type: 'null' }),
          404: errorResp('Client not found'),
        },
      },
    },
    '/api/clients/{id}/send-onboarding': {
      post: {
        tags: ['Clients'],
        summary: 'Generate a client onboarding invite link',
        description: 'Creates a 7-day token and returns the onboarding URL. In production, email this link to the client.',
        security: [adminBearerAuth],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: success({
            type: 'object',
            properties: {
              onboardingUrl: { type: 'string', example: 'http://localhost:3000/onboarding/abc123' },
              token: { type: 'string' },
              expiresAt: { type: 'string', format: 'date-time' },
            },
          }),
          404: errorResp('Client not found'),
        },
      },
    },

    // ── Onboarding ────────────────────────────────────────────────────────────
    '/api/onboarding/{token}': {
      get: {
        tags: ['Onboarding'],
        summary: 'Get onboarding info for a token',
        parameters: [{ name: 'token', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: success({
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              email: { type: 'string' },
              company: { type: 'string', nullable: true },
            },
          }),
          400: errorResp('Invalid or expired token'),
        },
      },
    },
    '/api/onboarding/{token}/complete': {
      post: {
        tags: ['Onboarding'],
        summary: 'Complete client onboarding',
        description: 'Sets the client password and activates the account. Returns a client JWT on success.',
        parameters: [{ name: 'token', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['password'],
                properties: {
                  password: { type: 'string', minLength: 8 },
                  phone: { type: 'string' },
                  company: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: success({
            type: 'object',
            properties: {
              token: { type: 'string', description: 'Client JWT' },
              client: { $ref: '#/components/schemas/Client' },
            },
          }),
          400: errorResp('Invalid/expired token or already completed'),
        },
      },
    },

    // ── Portal Auth ───────────────────────────────────────────────────────────
    '/api/portal/login': {
      post: {
        tags: ['Portal Auth'],
        summary: 'Client portal login',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: success({
            type: 'object',
            properties: {
              token: { type: 'string', description: 'Client JWT' },
              client: { $ref: '#/components/schemas/Client' },
            },
          }),
          401: errorResp('Invalid credentials'),
        },
      },
    },
    '/api/portal/forgot-password': {
      post: {
        tags: ['Portal Auth'],
        summary: 'Request a password reset link',
        description: 'Always returns the same message to prevent email enumeration. The reset URL is returned in the response body for development; in production it would be emailed.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email'],
                properties: {
                  email: { type: 'string', format: 'email' },
                },
              },
            },
          },
        },
        responses: {
          200: success({
            type: 'object',
            properties: {
              message: { type: 'string' },
              resetUrl: { type: 'string', description: 'Dev only — email this in production' },
              token: { type: 'string', description: 'Dev only' },
            },
          }),
        },
      },
    },
    '/api/portal/reset-password/{token}': {
      post: {
        tags: ['Portal Auth'],
        summary: 'Reset password using a reset token',
        description: 'Token expires after 1 hour.',
        parameters: [{ name: 'token', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['password'],
                properties: {
                  password: { type: 'string', minLength: 8 },
                },
              },
            },
          },
        },
        responses: {
          200: success({ type: 'null' }),
          400: errorResp('Invalid or expired reset token'),
        },
      },
    },

    // ── Portal ────────────────────────────────────────────────────────────────
    '/api/portal/me': {
      get: {
        tags: ['Portal'],
        summary: 'Get client profile',
        security: [clientBearerAuth],
        responses: {
          200: success({ $ref: '#/components/schemas/Client' }),
          401: errorResp('Unauthorized'),
        },
      },
      put: {
        tags: ['Portal'],
        summary: 'Update client profile',
        security: [clientBearerAuth],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  email: { type: 'string', format: 'email' },
                  phone: { type: 'string' },
                  company: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: success({ $ref: '#/components/schemas/Client' }),
          409: errorResp('Email already in use'),
        },
      },
    },
    '/api/portal/change-password': {
      post: {
        tags: ['Portal'],
        summary: 'Change password (requires current password)',
        security: [clientBearerAuth],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['currentPassword', 'newPassword', 'confirmPassword'],
                properties: {
                  currentPassword: { type: 'string' },
                  newPassword: { type: 'string', minLength: 8 },
                  confirmPassword: { type: 'string', minLength: 8 },
                },
              },
            },
          },
        },
        responses: {
          200: success({ type: 'null' }),
          400: errorResp('Current password incorrect or passwords do not match'),
        },
      },
    },
    '/api/portal/projects': {
      get: {
        tags: ['Portal'],
        summary: "List client's own projects",
        security: [clientBearerAuth],
        responses: {
          200: success({ type: 'array', items: { $ref: '#/components/schemas/Project' } }),
          401: errorResp('Unauthorized'),
        },
      },
    },
    '/api/portal/projects/{id}': {
      get: {
        tags: ['Portal'],
        summary: "Get a specific project (client-scoped, visible updates only)",
        security: [clientBearerAuth],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: success({ $ref: '#/components/schemas/Project' }),
          404: errorResp('Project not found'),
        },
      },
    },

    // ── Projects ──────────────────────────────────────────────────────────────
    '/api/projects': {
      get: {
        tags: ['Projects'],
        summary: 'List all projects',
        security: [adminBearerAuth],
        responses: {
          200: success({ type: 'array', items: { $ref: '#/components/schemas/Project' } }),
          401: errorResp('Unauthorized'),
        },
      },
      post: {
        tags: ['Projects'],
        summary: 'Create a project',
        security: [adminBearerAuth],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['clientId', 'name'],
                properties: {
                  clientId: { type: 'string' },
                  name: { type: 'string', example: 'Website Redesign' },
                  description: { type: 'string' },
                  status: {
                    type: 'string',
                    enum: ['PLANNING', 'IN_PROGRESS', 'REVIEW', 'COMPLETED', 'ON_HOLD', 'CANCELLED'],
                    default: 'PLANNING',
                  },
                  progress: { type: 'integer', minimum: 0, maximum: 100, default: 0 },
                  startDate: { type: 'string', format: 'date-time' },
                  endDate: { type: 'string', format: 'date-time' },
                  budget: { type: 'number' },
                  notes: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          201: success({ $ref: '#/components/schemas/Project' }),
          404: errorResp('Client not found'),
        },
      },
    },
    '/api/projects/{id}': {
      get: {
        tags: ['Projects'],
        summary: 'Get project with milestones and updates',
        security: [adminBearerAuth],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: success({ $ref: '#/components/schemas/Project' }),
          404: errorResp('Project not found'),
        },
      },
      put: {
        tags: ['Projects'],
        summary: 'Update a project',
        security: [adminBearerAuth],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  description: { type: 'string' },
                  status: { type: 'string', enum: ['PLANNING', 'IN_PROGRESS', 'REVIEW', 'COMPLETED', 'ON_HOLD', 'CANCELLED'] },
                  progress: { type: 'integer', minimum: 0, maximum: 100 },
                  startDate: { type: 'string', format: 'date-time' },
                  endDate: { type: 'string', format: 'date-time' },
                  budget: { type: 'number' },
                  notes: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: success({ $ref: '#/components/schemas/Project' }),
          404: errorResp('Project not found'),
        },
      },
      delete: {
        tags: ['Projects'],
        summary: 'Delete a project',
        security: [adminBearerAuth],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: success({ type: 'null' }),
          404: errorResp('Project not found'),
        },
      },
    },
    '/api/projects/{id}/milestones': {
      post: {
        tags: ['Projects'],
        summary: 'Add a milestone to a project',
        security: [adminBearerAuth],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title'],
                properties: {
                  title: { type: 'string', example: 'Design handoff' },
                  description: { type: 'string' },
                  status: { type: 'string', enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED'], default: 'PENDING' },
                  order: { type: 'integer' },
                  dueDate: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
        responses: {
          201: success({ $ref: '#/components/schemas/Milestone' }),
          404: errorResp('Project not found'),
        },
      },
    },
    '/api/projects/{id}/milestones/{milestoneId}': {
      put: {
        tags: ['Projects'],
        summary: 'Update a milestone',
        security: [adminBearerAuth],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'milestoneId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  description: { type: 'string' },
                  status: { type: 'string', enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED'] },
                  order: { type: 'integer' },
                  dueDate: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
        responses: {
          200: success({ $ref: '#/components/schemas/Milestone' }),
          404: errorResp('Milestone not found'),
        },
      },
      delete: {
        tags: ['Projects'],
        summary: 'Delete a milestone',
        security: [adminBearerAuth],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'milestoneId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: success({ type: 'null' }),
          404: errorResp('Milestone not found'),
        },
      },
    },
    '/api/projects/{id}/updates': {
      post: {
        tags: ['Projects'],
        summary: 'Post a project update',
        description: 'Set `isVisible: true` to make it visible in the client portal.',
        security: [adminBearerAuth],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title', 'content'],
                properties: {
                  title: { type: 'string', example: 'Design phase complete' },
                  content: { type: 'string', example: 'We finished all wireframes and mockups.' },
                  isVisible: { type: 'boolean', default: true, description: 'Show to client in portal' },
                },
              },
            },
          },
        },
        responses: {
          201: success({ $ref: '#/components/schemas/ProjectUpdate' }),
          404: errorResp('Project not found'),
        },
      },
    },
    '/api/projects/{id}/updates/{updateId}': {
      delete: {
        tags: ['Projects'],
        summary: 'Delete a project update',
        security: [adminBearerAuth],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'updateId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: success({ type: 'null' }),
          404: errorResp('Update not found'),
        },
      },
    },
  },
};
