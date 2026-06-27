# Kolekto

Kolekto is a team cash contribution and invoice management application.

Repository URL: https://github.com/anwarudin19/kolekto.git

## What It Does

Kolekto covers the main team cash flow:

Team -> Member -> Invoice -> Payment Submission -> Admin Approval -> Balance Update -> Transaction History

## Roles

- Owner/Admin
- Member
- Super Admin

## Current Scope

Implemented in the current codebase:

- JWT authentication
- Demo login for admin and member accounts
- Team creation and join by invite code
- Member management
- Invoice generation and invoice listing
- Payment submission with proof upload
- Payment approval and rejection
- Duplicate active payment prevention
- Transaction history
- Admin dashboard and admin management endpoints
- Prisma schema, migrations, and seed data
- Docker support
- TestSprite workflow scaffold

## Key Repository Paths

- `backend/` - NestJS API, Prisma schema, seed data, backend Dockerfile, backend env example
- `web-admin/` - Next.js App Router frontend
- `docs/` - project analysis, PRD, test plan, and test data
- `.github/workflows/` - GitHub Actions workflows
- `docker-compose.yml` - full stack local or server compose setup
- `docker-compose.override.yml` - local Docker override

## Demo Data

Use these seeded accounts and records for local testing and automation.

### Accounts

- Demo Admin: `admin@demo.com` / `password123`
- Demo Member: `budi@demo.com` / `password123`

### Seeded Records

- Team: `Futsal Squad`
- Invite code: `FUTSAL2026`
- Role: `Pemain Aktif`
- Account: `Kas Utama`
- Invoice: `INV-DEMO-001`

### Current Seeded State

- Users: admin, member, and super admin
- Team: 1 demo team
- Team members: 2 demo memberships
- Account: 1 team cash account
- Invoice: 1 unpaid demo invoice
- Payments: none yet
- Transactions: none yet

## Local Development

### Backend

Requirements:

- Node.js 20+
- PostgreSQL
- Redis
- MinIO or compatible object storage if you want proof uploads to work end-to-end

Commands:

```bash
cd backend
pnpm install
pnpm prisma:generate
pnpm prisma:deploy
pnpm seed
pnpm start:dev
```

Backend default port: `3000`

### Frontend

Requirements:

- Node.js 20+

Commands:

```bash
cd web-admin
npm install
npm run dev
```

Frontend default dev port: `3002`

### Docker Compose

Run the full stack when the env files are ready:

```bash
docker compose up --build
```

Default host ports in the compose setup:

- Frontend: `3001`
- Backend: `3000`
- PostgreSQL: `5432`
- MinIO API: `9000`
- MinIO console: `9001`

## Environment Variables

### Backend

See `backend/.env.example` for the full list. Key values include:

- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `APP_FRONTEND_URL`
- PostgreSQL variables
- Redis variables
- MinIO variables
- upload limits
- SMTP variables

### Frontend

Required value:

- `NEXT_PUBLIC_API_URL`

For production, set frontend and API URLs in your hosting platform and GitHub Secrets.

## TestSprite Notes

- Demo login buttons are available on the login page.
- Stable `data-testid` selectors exist for the main business flow.
- TestSprite should target the live frontend URL, not localhost.
- The GitHub Actions workflow runs TestSprite only on `main` or manual dispatch.
- Make sure the live frontend URL is reachable and seed data is loaded before running TestSprite.

## GitHub Actions

Workflow location:

- `.github/workflows/testsprite.yml`

Workflow behavior:

- Build backend and frontend on `feature/kolekto-core`, `main`, and pull requests to `main`
- Run TestSprite only on `main` or manual `workflow_dispatch`
- Wait for the live app to become reachable before TestSprite starts

## Important Documentation

- `docs/PROJECT_ANALYSIS.md`
- `docs/PRD.md` - index file
- `docs/PRD.id.md` - Indonesian PRD source of truth
- `docs/PRD.en.md` - English PRD source of truth
- `docs/TEST_PLAN.md`
- `docs/TEST_DATA.md`
- `LOOP.md`

## Health Check

The backend exposes `GET /health`.

## Deployment Notes

- Backend target: Coolify or VPS using Docker
- Frontend target: Vercel or Coolify
- Main branch: `main`
- Development branch: `feature/kolekto-core`
- Live frontend URL and live API URL should come from environment variables, not hardcoded in the app
