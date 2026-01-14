# Recipe Sharing Network 

Modern Angular (v21) + Angular Material demo app for a “Recipe Sharing Network”, built to run **fully without a backend** on first run via a persistent **Mock API** layer.

## Quickstart

```bash
npm install
npm start
```

Then open `http://localhost:4200`.

## Demo accounts (Mock API)

- Regular user (creator permissions): `user@demo.com` / `Password123!`
- Management: `manager@demo.com` / `Password123!`
- Admin: `admin@demo.com` / `Password123!`

Guests (not logged in) can browse public recipes.

## Mock API (offline-first)

The app defaults to `environment.useMockApi = true` and simulates:

- Auth + “/auth/me” via a fake token stored in localStorage (`rsn.auth.token`)
- Server-side paging/filtering/sorting on list screens (simulated in-memory)
- Artificial latency (300–700ms)
- Persisted demo DB in localStorage (`rsn.mock.db.v1`)
- Dev-only toggles:
  - **Simulate errors** (random 500s)
  - **Role switcher** (only when `useMockApi=true`)
- Reset demo data: **Profile → Reset demo data**

Seed data includes 50+ recipes, 10 categories, 10+ users, ratings, favorites, comments, and moderation reports.

## Routes & roles

Public:
- `/` home
- `/recipes` listing (filters/sort/paging, grid/table toggle)
- `/recipes/:id` details (read-only for guests)
- `/login`, `/register` (register is mock-only)
- `/authors`, `/docs`

Authenticated:
- `/profile`
- `/favorites` (explorer/creator)
- `/reports/new` (explorer/creator)

Creator:
- `/my-recipes`
- `/recipes/new`
- `/recipes/:id/edit`

Management:
- `/management/categories`
- `/management/moderation`
- `/management/stats` (charts)

Admin:
- `/admin/users` (role changes + password reset)

## Switching to a real backend

1) Set `useMockApi` to `false` and configure the base URL:

- `src/environments/environment.ts` (development)
- `src/environments/environment.prod.ts` (production)

```ts
export const environment = {
  production: false,
  useMockApi: false,
  apiBaseUrl: 'https://your-backend.example/api',
} as const;
```

2) Adjust endpoint paths only in the Http API implementations:

- `src/app/api/http/http-auth-api.ts`
- `src/app/api/http/http-recipes-api.ts`
- `src/app/api/http/http-categories-api.ts`
- `src/app/api/http/http-users-api.ts`
- `src/app/api/http/http-favorites-api.ts`
- `src/app/api/http/http-comments-api.ts`
- `src/app/api/http/http-ratings-api.ts`
- `src/app/api/http/http-reports-api.ts`
- `src/app/api/http/http-stats-api.ts`

UI components depend only on the abstract APIs in `src/app/api/apis/*` and should not need changes.

## Project structure (high level)

- `src/app/api/` API abstractions + mock/http implementations
- `src/app/core/` layout, auth/RBAC, guards, interceptors, global error handling
- `src/app/shared/` shared Material module + reusable UI components (empty states, skeletons, confirm dialog)
- `src/app/features/` feature areas (public/auth/recipes/profile/reports/management/admin)

