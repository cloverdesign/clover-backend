# Clover CMS — Backend API

A RESTful backend for a content management system built for web agencies. It covers webpage content authoring, media management, client relationship management, client onboarding, and project progress tracking through a client-facing portal.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Running the Server](#running-the-server)
- [API Documentation](#api-documentation)
- [Project Structure](#project-structure)
- [Authentication](#authentication)
- [API Reference](#api-reference)
  - [Health Check](#health-check)
  - [Admin Auth](#admin-auth)
  - [Pages](#pages)
  - [Content Blocks](#content-blocks)
  - [Media](#media)
  - [Clients](#clients)
  - [Client Onboarding](#client-onboarding)
  - [Client Portal](#client-portal)
  - [Projects](#projects)
  - [Milestones](#milestones)
  - [Project Updates](#project-updates)
- [Content Block Reference](#content-block-reference)
- [Client Lifecycle](#client-lifecycle)
- [File Uploads](#file-uploads)
- [Error Handling](#error-handling)

---

## Overview

Clover CMS provides two distinct surfaces:

**Admin surface** — Used internally by agency staff to manage website pages and content, upload media, manage client accounts, run projects, and post progress updates.

**Client portal** — A read-oriented surface that allows clients to log in, view their projects, track milestone completion, and read updates posted by the agency. Clients can also manage their own profile and credentials.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express 4 |
| Language | TypeScript |
| ORM | Prisma |
| Database | PostgreSQL |
| Authentication | JSON Web Tokens (JWT) |
| File Uploads | Multer (local disk storage) |
| Validation | Zod |
| API Docs | Swagger UI (OpenAPI 3.0) |

---

## Prerequisites

- Node.js 18 or later
- PostgreSQL 14 or later
- npm 9 or later

---

## Getting Started

Clone the repository and install dependencies:

```bash
git clone <repository-url>
cd clover-backend
npm install
```

Copy the environment variable template and fill in your values:

```bash
cp .env.example .env
```

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `JWT_SECRET` | Yes | — | Secret used to sign all JWTs. Use a long, random string in production. |
| `PORT` | No | `3000` | Port the server listens on |
| `NODE_ENV` | No | `development` | `development` or `production` |
| `BASE_URL` | No | `http://localhost:3000` | Public base URL, used to build onboarding and password reset links |

Example `.env`:

```
DATABASE_URL="postgresql://postgres:password@localhost:5432/clover_cms"
JWT_SECRET="replace-this-with-a-long-random-secret"
PORT=3000
NODE_ENV=development
BASE_URL="http://localhost:3000"
```

The server will throw on startup if `DATABASE_URL` or `JWT_SECRET` are missing.

---

## Database Setup

Push the Prisma schema to your database:

```bash
npm run db:push
```

To use migrations instead (recommended for production):

```bash
npm run db:migrate
```

To open Prisma Studio (database browser):

```bash
npm run db:studio
```

To regenerate the Prisma client after changing `prisma/schema.prisma`:

```bash
npm run db:generate
```

---

## Running the Server

Development mode with auto-restart on file changes:

```bash
npm run dev
```

Production build:

```bash
npm run build
npm start
```

On startup the server prints:

```
  Clover CMS API
  Running on: http://localhost:3000
  Docs: http://localhost:3000/docs
  Environment: development
  Port: 3000
```

---

## API Documentation

Interactive Swagger UI is available at:

```
http://localhost:3000/docs
```

The raw OpenAPI 3.0 JSON spec is available at:

```
http://localhost:3000/docs.json
```

The spec can be imported directly into Postman, Insomnia, or any other API client that supports OpenAPI. The Swagger UI includes a persistent Authorize button — paste a JWT once and it will be included in all subsequent requests for the duration of your session.

---

## Project Structure

```
clover-backend/
├── prisma/
│   └── schema.prisma          # Database schema and enums
├── src/
│   ├── index.ts               # App entry point, middleware, route mounting
│   ├── config/
│   │   ├── env.ts             # Environment variable loading and validation
│   │   └── swagger.ts         # OpenAPI 3.0 specification
│   ├── lib/
│   │   └── prisma.ts          # Prisma client singleton
│   ├── middleware/
│   │   ├── auth.ts            # JWT guards (requireAdmin, requireClient) and token signers
│   │   ├── errorHandler.ts    # Central error handler and 404 catcher
│   │   └── upload.ts          # Multer configuration for file uploads
│   ├── modules/
│   │   ├── auth/              # Admin registration and login
│   │   ├── pages/             # Page and content block management
│   │   ├── media/             # File upload and media library
│   │   ├── clients/           # Client CRUD, onboarding, and portal
│   │   └── projects/          # Project, milestone, and update management
│   └── utils/
│       └── response.ts        # sendSuccess / sendError helpers
└── uploads/                   # Uploaded files (served as static assets)
```

Each module contains a `*.routes.ts` file (router), a `*.controller.ts` file (request parsing and response), and a `*.service.ts` file (business logic and database access).

---

## Authentication

The API uses two separate JWT-based authentication flows to prevent token misuse between roles.

### Admin tokens

Issued by `POST /api/auth/login`. The payload contains `{ adminId, role: "admin" }`. Admin tokens are valid for 7 days. Include the token in the `Authorization` header:

```
Authorization: Bearer <admin-token>
```

### Client tokens

Issued by `POST /api/portal/login` and also at the end of the onboarding flow. The payload contains `{ clientId, role: "client" }`. Client tokens are valid for 7 days. Admin tokens will be rejected on client-only routes and vice versa.

---

## API Reference

All endpoints are prefixed with `/api`. Responses always follow this envelope:

```json
{
  "success": true,
  "message": "Human-readable status",
  "data": { }
}
```

On error:

```json
{
  "success": false,
  "message": "Description of what went wrong"
}
```

---

### Health Check

#### GET /health

Returns the server status. No authentication required.

**Response**
```json
{
  "success": true,
  "message": "Clover CMS API is running",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "environment": "development"
}
```

---

### Admin Auth

#### POST /api/auth/register

Create an admin account.

**Body**
```json
{
  "name": "Patrick Oguamanam",
  "email": "admin@clover.com",
  "password": "securepassword"
}
```

**Response** — `201`
```json
{
  "data": {
    "id": "...",
    "name": "Patrick Oguamanam",
    "email": "admin@clover.com",
    "createdAt": "..."
  }
}
```

---

#### POST /api/auth/login

Authenticate as an admin and receive a JWT.

**Body**
```json
{
  "email": "admin@clover.com",
  "password": "securepassword"
}
```

**Response** — `200`
```json
{
  "data": {
    "token": "<jwt>",
    "admin": { "id": "...", "name": "...", "email": "..." }
  }
}
```

---

#### GET /api/auth/me

Get the currently authenticated admin's profile.

**Auth** — Admin JWT required

---

### Pages

Pages are the top-level content containers for your website. Each page has a unique slug, metadata, and an ordered list of content blocks.

#### GET /api/pages

List all pages. Admin only.

#### POST /api/pages

Create a new page.

**Body**
```json
{
  "slug": "about-us",
  "title": "About Us",
  "description": "Learn about our agency",
  "metaTitle": "About Us | Clover Agency",
  "metaDesc": "We are a full-service digital agency.",
  "isPublished": false
}
```

#### GET /api/pages/:id

Get a page and all of its blocks. Admin only.

#### GET /api/pages/slug/:slug

Get a published page by its slug. Public — no authentication required. Returns `404` if the page does not exist or `isPublished` is `false`.

#### PUT /api/pages/:id

Update page metadata. Partial updates are supported.

#### DELETE /api/pages/:id

Delete a page. All blocks belonging to the page are deleted via cascade.

---

### Content Blocks

Content blocks are the individual pieces of content within a page. They are ordered and each carries a `content` JSON payload and a `styles` JSON object for visual overrides.

#### POST /api/pages/:id/blocks

Add a block to a page. The block is appended to the end of the page unless `order` is specified.

**Body**
```json
{
  "type": "HEADING",
  "content": { "text": "Our Story", "level": 1 },
  "styles": { "color": "#1a1a1a", "textAlign": "center" },
  "isVisible": true
}
```

#### PUT /api/pages/:id/blocks/:blockId

Update a block's content, styles, visibility, or position.

#### DELETE /api/pages/:id/blocks/:blockId

Remove a block from a page.

#### PUT /api/pages/:id/blocks/reorder

Reorder multiple blocks in one request.

**Body**
```json
{
  "blocks": [
    { "id": "block_abc", "order": 0 },
    { "id": "block_def", "order": 1 },
    { "id": "block_ghi", "order": 2 }
  ]
}
```

---

### Media

#### POST /api/media/upload

Upload a file. The request must be `multipart/form-data` with a single field named `file`. Uploaded files are stored under the `uploads/` directory and served at `/uploads/<filename>`.

Accepted types and size limits:

| Type | Formats | Limit |
|---|---|---|
| Image | JPEG, PNG, GIF, WebP, SVG | 10 MB |
| Video | MP4, MOV, WebM | 100 MB |

**Response** — `201`
```json
{
  "data": {
    "id": "...",
    "filename": "1720000000000-photo.jpg",
    "originalName": "photo.jpg",
    "url": "/uploads/1720000000000-photo.jpg",
    "type": "IMAGE",
    "mimeType": "image/jpeg",
    "size": 204800,
    "createdAt": "..."
  }
}
```

#### GET /api/media

List all uploaded files, ordered by upload date descending.

#### DELETE /api/media/:id

Delete a media record and remove the file from disk.

---

### Clients

#### GET /api/clients

List all clients with a project count. Admin only.

#### POST /api/clients

Create a new client record.

**Body**
```json
{
  "name": "Acme Corporation",
  "email": "hello@acme.com",
  "phone": "+1 555 000 0000",
  "company": "Acme Corporation",
  "notes": "Referred by existing client.",
  "status": "LEAD"
}
```

Client statuses: `LEAD`, `ONBOARDING`, `ACTIVE`, `ON_HOLD`, `CHURNED`.

#### GET /api/clients/:id

Get a client and all of their projects.

#### PUT /api/clients/:id

Update a client record. Partial updates are supported.

#### DELETE /api/clients/:id

Delete a client. All associated projects are deleted via cascade.

#### POST /api/clients/:id/send-onboarding

Generate a 7-day onboarding invite link for the client. Sets the client's status to `ONBOARDING`. Returns the URL and token.

In production, email the `onboardingUrl` to the client. In development, the URL is returned directly in the response body.

**Response** — `200`
```json
{
  "data": {
    "onboardingUrl": "http://localhost:3000/onboarding/abc123...",
    "token": "abc123...",
    "expiresAt": "..."
  }
}
```

---

### Client Onboarding

These routes are public and do not require authentication.

#### GET /api/onboarding/:token

Validate an onboarding token and return the client's name and email so the frontend can display a personalised welcome screen. Returns `400` if the token is invalid or expired.

#### POST /api/onboarding/:token/complete

Complete the onboarding process. Sets the client's password, optionally updates their phone and company, clears the onboarding token, marks `onboardingCompletedAt`, and sets their status to `ACTIVE`. Returns a client JWT on success.

**Body**
```json
{
  "password": "securepassword",
  "phone": "+1 555 000 0001",
  "company": "Acme Corporation"
}
```

**Response** — `200`
```json
{
  "data": {
    "token": "<client-jwt>",
    "client": { ... }
  }
}
```

---

### Client Portal

#### POST /api/portal/login

Authenticate as a client.

**Body**
```json
{
  "email": "hello@acme.com",
  "password": "securepassword"
}
```

#### POST /api/portal/forgot-password

Request a password reset link. To prevent email enumeration, the response is identical regardless of whether the email exists in the system.

In production, the reset link should be emailed to the client. In development, the link and token are included in the response body.

Reset tokens expire after one hour.

**Body**
```json
{
  "email": "hello@acme.com"
}
```

#### POST /api/portal/reset-password/:token

Reset the client's password using a valid reset token. The token is invalidated after use.

**Body**
```json
{
  "password": "newsecurepassword"
}
```

#### GET /api/portal/me

Get the authenticated client's profile.

**Auth** — Client JWT required

#### PUT /api/portal/me

Update the authenticated client's profile. Partial updates are supported. Email uniqueness is enforced.

**Auth** — Client JWT required

**Body**
```json
{
  "name": "Jane Smith",
  "email": "jane@acme.com",
  "phone": "+1 555 000 0002",
  "company": "Acme Corporation"
}
```

#### POST /api/portal/change-password

Change the authenticated client's password. Requires the current password to be provided. The new password must differ from the current one.

**Auth** — Client JWT required

**Body**
```json
{
  "currentPassword": "oldsecurepassword",
  "newPassword": "newsecurepassword",
  "confirmPassword": "newsecurepassword"
}
```

#### GET /api/portal/projects

List all projects belonging to the authenticated client. Milestones and visible updates are included.

**Auth** — Client JWT required

#### GET /api/portal/projects/:id

Get a single project. Only returns updates where `isVisible` is `true`. Returns `404` if the project belongs to a different client.

**Auth** — Client JWT required

---

### Projects

All project routes require an admin JWT.

#### GET /api/projects

List all projects across all clients.

#### POST /api/projects

Create a project for an existing client.

**Body**
```json
{
  "clientId": "...",
  "name": "Website Redesign",
  "description": "Full redesign of the corporate website.",
  "status": "PLANNING",
  "progress": 0,
  "startDate": "2024-02-01T00:00:00.000Z",
  "endDate": "2024-05-01T00:00:00.000Z",
  "budget": 12000.00,
  "notes": "Client prefers weekly updates."
}
```

Project statuses: `PLANNING`, `IN_PROGRESS`, `REVIEW`, `COMPLETED`, `ON_HOLD`, `CANCELLED`.

`progress` is an integer from `0` to `100` representing completion percentage.

#### GET /api/projects/:id

Get a project with its milestones and all updates (including those hidden from the client).

#### PUT /api/projects/:id

Update a project. Partial updates are supported.

#### DELETE /api/projects/:id

Delete a project. Milestones and updates are deleted via cascade.

---

### Milestones

All milestone routes require an admin JWT.

#### POST /api/projects/:id/milestones

Add a milestone to a project.

**Body**
```json
{
  "title": "Design handoff",
  "description": "Finalise all wireframes and high-fidelity mockups.",
  "status": "PENDING",
  "order": 1,
  "dueDate": "2024-03-01T00:00:00.000Z"
}
```

Milestone statuses: `PENDING`, `IN_PROGRESS`, `COMPLETED`. Setting status to `COMPLETED` automatically records `completedAt`.

#### PUT /api/projects/:id/milestones/:milestoneId

Update a milestone. Partial updates are supported.

#### DELETE /api/projects/:id/milestones/:milestoneId

Delete a milestone.

---

### Project Updates

Project updates are messages posted by the agency to document progress. Each update has an `isVisible` flag that controls whether it appears in the client portal.

#### POST /api/projects/:id/updates

Post an update on a project.

**Body**
```json
{
  "title": "Design phase complete",
  "content": "All wireframes and mockups have been approved by the team. We are moving into development.",
  "isVisible": true
}
```

Set `isVisible` to `false` to keep the update internal (admin-only). Clients will not see it in their portal.

#### DELETE /api/projects/:id/updates/:updateId

Delete a project update.

---

## Content Block Reference

Each block type expects a specific shape in the `content` field. The `styles` field accepts any CSS-like key-value pairs and is applied by the frontend renderer.

### HEADING

```json
{
  "type": "HEADING",
  "content": { "text": "Section Title", "level": 2 }
}
```

`level` corresponds to HTML heading levels 1 through 6.

### TEXT

```json
{
  "type": "TEXT",
  "content": { "text": "Paragraph content here. Supports plain text or HTML." }
}
```

### IMAGE

```json
{
  "type": "IMAGE",
  "content": {
    "src": "/uploads/1720000000000-hero.jpg",
    "alt": "Hero image",
    "href": "https://example.com"
  }
}
```

`href` is optional. When provided, the image renders as a link.

### VIDEO

```json
{
  "type": "VIDEO",
  "content": {
    "src": "/uploads/1720000000000-intro.mp4",
    "poster": "/uploads/1720000000000-thumbnail.jpg"
  }
}
```

### BUTTON

```json
{
  "type": "BUTTON",
  "content": {
    "label": "Get in Touch",
    "href": "/contact",
    "target": "_self"
  }
}
```

### DIVIDER

```json
{
  "type": "DIVIDER",
  "content": {}
}
```

### EMBED

```json
{
  "type": "EMBED",
  "content": { "embed_url": "https://www.youtube.com/embed/dQw4w9WgXcQ" }
}
```

### SPACER

```json
{
  "type": "SPACER",
  "content": { "height": "80px" }
}
```

### COLUMNS

```json
{
  "type": "COLUMNS",
  "content": {
    "columns": [
      { "blocks": [] },
      { "blocks": [] }
    ]
  }
}
```

Each column in `columns` can contain a nested array of block objects following the same structure.

---

## Client Lifecycle

The typical flow from lead to active client:

1. Admin creates a client record via `POST /api/clients` with status `LEAD`.
2. Admin calls `POST /api/clients/:id/send-onboarding` to generate an invite link.
3. The client receives the link and visits it. The frontend calls `GET /api/onboarding/:token` to display their name.
4. The client submits their password and additional details via `POST /api/onboarding/:token/complete`. Their status is set to `ACTIVE` and they receive a JWT.
5. The client can now log in at any time via `POST /api/portal/login` and access their portal.
6. The admin creates a project for the client via `POST /api/projects`, adds milestones, and posts updates throughout the engagement.
7. The client tracks progress in real time through the portal.

---

## File Uploads

Uploaded files are stored on the local filesystem under `uploads/`. The directory is served as static files at the `/uploads` path.

Filenames are sanitised and prefixed with a Unix timestamp to avoid collisions:

```
1720000000000-my-file-name.jpg
```

In production, consider replacing the local disk storage with a cloud provider such as AWS S3 or Cloudinary. This would require updating `src/middleware/upload.ts` and `src/modules/media/media.service.ts`.

---

## Error Handling

All errors are handled by the central error middleware in `src/middleware/errorHandler.ts` and return a consistent JSON response.

Common HTTP status codes used throughout the API:

| Code | Meaning |
|---|---|
| `200` | Success |
| `201` | Resource created |
| `400` | Validation error or bad request |
| `401` | Missing or invalid token |
| `403` | Authenticated but not authorised (wrong role) |
| `404` | Resource not found |
| `409` | Conflict (e.g. duplicate email or slug) |
| `500` | Internal server error |

Unmatched routes return `404` with the message `Route not found`.
