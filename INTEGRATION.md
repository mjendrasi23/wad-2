# Frontend ↔ Backend Integration

This repo contains:
- Backend: Express + TypeScript in `src/`
- Frontend: Angular in `frontend/`

The Angular app now calls the real backend API (no mock API required).

## Local Run

### 1) Dev (two processes, recommended)

Backend:
- `npm install`
- `npm run dev`

Frontend (separate terminal):
- `npm --prefix frontend install`
- `npm --prefix frontend start`

Notes:
- Frontend dev API base URL is set in `frontend/src/environments/environment.ts` to `http://localhost:12157/api`.
- Backend enables CORS for `http://localhost:4200` by default (see `CORS_ORIGIN`).

### 2) Single server (build frontend, serve from backend)

- `npm install`
- `npm --prefix frontend install`
- `npm run build`
- `npm start`

Then open `http://localhost:12157/`.

## Auth Model

The backend uses cookie-based sessions (`express-session` + `passport`), not JWT.
- The frontend sends cookies via an Angular HTTP interceptor (`withCredentials: true`).

Login identifier:
- **Username or email**.

## Backend Configuration (.env)

See `.env-example`. Most-used vars:
- `PORT` (default `12157`)
- `APIURL` (default `/api`)
- `DBFILE` (default `./db/recipes.sqlite3`)
- `SESSIONSDBFILE` (default `./db/sessions.sqlite3`)
- `CORS_ORIGIN` (default `http://localhost:4200`, comma-separated allowed origins)
- `ADMINPASSWORD` (default `Admin123`, used only when the DB is first created)
- `SEED_PASSWORD` (default `Password123!`, used by `npm run seed`)
- `RESET_PASSWORD` (default `Password123!`, used by the admin reset-password endpoint)

## API Endpoints Used By The Frontend

Base prefix: `APIURL` (default `/api`).

### Authentication

- `POST /api/auth/login`
  - Body: `{ "username": string, "password": string }`
  - 200: `{ "message": string, "user": { "user_id": number, "username": string, "email": string, "role_id": number, "created_at": string }, "roles": number[] }`
  - Auth: creates a session cookie

- `POST /api/auth/register`
  - Body: `{ "username": string, "email": string, "password": string, "role_id"?: number }`
  - 201: same shape as login (also logs the user in via session)

- `GET /api/auth/me`
  - 200: `{ "user": null, "roles": null }` (guest) or same user/roles shape (authenticated)

- `DELETE /api/auth/logout`
  - 200/204: ends the session

### Recipes

- `GET /api/recipes`
  - Query: `page`, `pageSize`, `sortBy`, `sortDir`, `categoryId?`, `tags?` (comma-separated or repeated), `ingredientSearch?`, `minRating?`, `textSearch?`
  - 200: `{ items: any[], total: number, page: number, pageSize: number }`

- `GET /api/recipes/mine` (creator/admin)
  - Query: `page`, `pageSize`, `textSearch?`
  - 200: paged result

- `GET /api/recipes/:id`
  - 200: recipe row + `ingredients: [{ ingredient_name, quantity, unit }]`, `tags: string[]`, `favoritesCount`, `ratingsCount`

- `POST /api/recipes` (creator/admin)
  - Accepts the frontend `RecipeUpsert` payload (`categoryId`, `tags`, `ingredients[{text}]`, `steps[]`, `imageUrl`, `imageCrop?`).
  - 201: same shape as `GET /api/recipes/:id`

- `PUT /api/recipes/:id` (owner or manager/admin)
  - Same payload as create

- `DELETE /api/recipes/:id` (owner or manager/admin)

### Categories

- `GET /api/categories`
- `POST /api/categories` (manager/admin): `{ name, description }`
- `PUT /api/categories/:id` (manager/admin): `{ name, description }`
- `DELETE /api/categories/:id` (manager/admin)

### Comments

- `GET /api/recipes/:recipeId/comments`
- `POST /api/recipes/:recipeId/comments` (authenticated)
  - Body: `{ body: string }` (the frontend also sends `recipeId`, which is ignored)
- `DELETE /api/comments/:id` (author, recipe owner, or manager/admin)

### Ratings

- `GET /api/recipes/:recipeId/ratings`
- `GET /api/recipes/:recipeId/ratings/summary`
- `POST /api/recipes/:recipeId/ratings` (authenticated)
  - Body: `{ value: 1..5 }`
  - Response: `{ recipeId, avgRating, count, myRating? }`

### Favorites

- `GET /api/favorites` (authenticated): paged recipes
- `GET /api/favorites/:recipeId` (authenticated): `boolean`
- `POST /api/favorites/:recipeId` (authenticated): `{ isFavorite: boolean }`

### Reports + Moderation

- `POST /api/reports` (authenticated)
  - Body: `{ targetType: 'recipe'|'comment', targetId: string, reason: string, details?: string }`
  - 201: `Report`

- `GET /api/management/moderation` (manager/admin)
  - Query: `page`, `pageSize`, `type?` (`recipe|comment|report`), `status?` (`open|resolved|removed`)
  - 200: paged `Report[]`

- `POST /api/management/moderation/:reportId/resolve` (manager/admin)
- `POST /api/management/moderation/:reportId/remove` (manager/admin)
  - Removes the target content (deletes recipe or comment) and marks the report as `removed`.

### Stats

- `GET /api/stats/categories/popular` (manager/admin): `CategoryCountStat[]`
- `GET /api/stats/categories/ratings` (manager/admin): `CategoryRatingStat[]`

### Admin Users

- `GET /api/admin/users` (admin)
  - Query: `page`, `pageSize`, `search?`, `role?`
  - 200: paged `User[]` in the frontend shape

- `GET /api/admin/users/:id` (admin)
- `PATCH /api/admin/users/:id` (admin): `{ role: 'explorer'|'creator'|'manager'|'admin' }`
- `POST /api/admin/users/:id/reset-password` (admin): resets to `RESET_PASSWORD` (default `Password123!`)

### Uploads

- `POST /api/upload` (authenticated)
  - `multipart/form-data`: `file`, `path=recipes`, `name=<filename>`
  - 200: `{ message, file: { savedAs, ... } }` (frontend stores `/uploads/...` into `imageUrl`)

## Data Mapping Notes

- Roles: backend `role_id` is mapped to frontend `UserRole` as:
  - `1 → admin`, `2 → manager`, `3 → creator`, `4 → explorer`
- Recipe steps: backend stores `steps` as a single string; the frontend displays them as an array by splitting on newlines / `1. 2. ...`.
- Ingredients: frontend sends free-text `ingredients[{text}]`; backend stores them in normalized tables using a simple parser (`"2 tbsp sugar"` → quantity/unit/name).
- Views are not tracked in the backend schema; the frontend shows `0`.
- Recipe images: the UI shows a universal 4:3 frame; `imageCrop` (originX/originY/zoom) is stored in `recipes.image_crop` and applied wherever the image is rendered.

## Manual Verification Checklist

- Start backend + frontend dev servers
- Register a user, then log out and log back in
- Recipes list loads from backend and paging works
- Recipe detail loads (ingredients/tags/ratings/comments)
- Create a recipe (creator role) and verify it shows up in “My recipes”
- Favorite/unfavorite a recipe and verify “Favorites” page
- Post a rating + comment from the recipe detail page
- As admin: open `/admin/users`, change a user role, reset password
- As manager/admin: open `/management/moderation`, create a report, resolve/remove it
