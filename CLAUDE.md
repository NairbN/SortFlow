# SortFlow — Project Context

## What this is

SortFlow is a suite of internal tools for the sort team at DMD Systems Recovery, an IT asset disposition (I-TAD) warehouse. It's built as a solo portfolio project (seeded/fake data, no real company data), with the long-term goal of pitching a similar system internally at DMD once it's proven out.

## The problem it solves

The **primary** problem is replacing a manually maintained SLA spreadsheet. Right now, one sort team member manually tracks incoming orders and their due dates in a spreadsheet, and the team references it to decide what to work on next. SortFlow replaces that spreadsheet with a live, shared tool.

Secondary (lower priority, "nice to have" polish) problems:

- Reducing outbound pallet mix-ups (rare in practice, but still a source of confusion)
- Making it faster to find where an outbound pallet physically is, via a visual floor map instead of a list

## How the real warehouse operation works (background context)

- Pallets arrive and get a pallet ID, then get racked at a location like `CA01-RCK01`.
- Orders are prioritized by an SLA due date; an order can span multiple pallets.

**ID format convention:** `order_number` is `ORD-00000` (five digits). Inbound `pallet_id` is `PLT-0000000` (seven digits). These are free-text fields (no backend validation enforcing the pattern), so this is a convention for seed data and manual entry, not a hard constraint.
- The sort team pulls pallets by order, unpacks them, and scans each asset to either an **outbound pallet** (commodity/recycling, grouped by category) or a **pending-wipe rack** (data-bearing/valuable items, headed to the audit team).
- Outbound pallets are per-category (e.g. laptops, wires, printers). Most categories have a fixed rack location that persists across pallet swaps. One exception: a shared "CA commodity" floor area with no rack, used by several categories.
- Audit team (not in scope for this app) handles grading, wiping, and staging for resale or teardown.

## Scope

This is explicitly an **accessory app** — it complements the sort team's existing scanning/tracking app, it does not replace it. It is scoped to the **sort team only** (not audit).

### Version 1 — in scope

1. **Receiving / SLA queue** (flagship feature — most important)
   - Log new orders: client name, order ID, pallet ID(s), SLA due date
   - Work queue view, default sorted by earliest due date
   - Manual reordering via **drag-and-drop**, open to anyone on the sort team (no role restrictions in v1)
   - Manual order **persists** for everyone until someone drags again — it does not auto-revert to SLA-date sort
   - **Pallet Kanban board**: each pallet carries a status — `backlog` → `staged` → `in_progress` → `completed` — shown as one global Kanban board across all active orders. Only the #1 order's `backlog` pallets auto-promote to `staged`; if an order loses the #1 spot, its still-`staged`-and-untouched pallets revert to `backlog` (pallets already `in_progress`/`completed` are never touched by this). When every pallet on an order reaches `completed`, the order is soft-archived (`archived_at` set) and disappears from both the SLA queue and the Kanban board. Sorters can drag any pallet card to any column at any time — the auto-staging just sets a sensible default, it doesn't lock anything.

### Deferred / reverted

- **Outbound pallet board + floor map view**: built (backend + frontend, including an interactive pan/zoom floor plan), then deliberately reverted and removed — decided not to pursue this for now. If revisited later, don't assume the old design is still right; re-scope from scratch with the user rather than restoring the old code from git history.

### Version 2 — future, not in scope now

- Model lookup tool: solves the pain point of having to manually search up unfamiliar device models (is it data-bearing? above/below the resale cut line vs. eBay/documentation?) — currently done by sending a message in a chat. Keep this in mind for future modularity but do not build it yet.

## Tech stack

- **Frontend**: Next.js (TypeScript, Tailwind, App Router), deployed on Vercel
- **Backend**: FastAPI, containerized with Docker, deployed on Railway in production (chosen for being Docker-native — it deploys the existing `Dockerfile` as-is with no platform-specific rewrite)
- **Database**: Postgres — Supabase in production (also gives realtime updates), plain Postgres via Docker Compose for local dev. Same connection-string-based setup for both; swap the `DATABASE_URL` env var between environments.
- **Local dev**: Docker Compose runs the backend + local Postgres. The Next.js frontend runs locally via `npm run dev` (NOT Dockerized — would slow down hot reload for no benefit).
- **Auth**: No per-user accounts in v1. Two layers, both shared secrets (not per-user):
  - **Frontend**: `frontend/proxy.ts` (Next 16's renamed `middleware.ts`; defaults to the Node.js runtime, not Edge-only) gates every route except `/login`. Session is a cookie holding a SHA-256 hash of the shared `SITE_PASSWORD` env var (not the plaintext password), checked against a freshly-computed hash on every request — no session store needed.
  - **Backend**: `backend/app/auth.py`'s `require_api_key` dependency, applied per-router at the `include_router()` call in `main.py` (not app-wide), so `/health` stays exempt without special-casing. Checks an `X-API-Key` header against `BACKEND_API_KEY` via `hmac.compare_digest` (constant-time, avoids timing attacks). The browser never calls the backend directly — every request comes from the Next.js server via `frontend/lib/backend.ts`'s `backendFetch()` wrapper, which attaches the header automatically — so this is service-to-service auth, not a second user-facing login. `backend/scripts/seed.sh` also needs this header since it talks to the API directly.
- **Orchestration**: Docker + Docker Compose only. No Kubernetes — deliberately decided against it as overkill for this project's scale.

## Design principle: modularity

Structure the backend so each "tool" (SLA queue, future model lookup, etc.) is self-contained — its own models, schemas, and router — so new tools can be added later without touching existing code. See backend folder structure below.

```
backend/
├── app/
│   ├── main.py
│   ├── database.py
│   ├── auth.py
│   ├── models/
│   │   ├── order.py
│   │   └── pallet.py
│   ├── schemas/
│   │   ├── order.py
│   │   └── pallet.py
│   ├── staging.py
│   └── routers/
│       ├── orders.py
│       └── pallets.py
├── tests/
│   ├── conftest.py
│   ├── test_auth.py
│   ├── test_orders.py
│   ├── test_pallets.py
│   └── test_staging.py
├── scripts/seed.sh
├── Dockerfile
├── requirements.txt
```

`staging.py` is a deliberate, narrow exception to the one-router-per-tool rule: pallet staging is defined entirely in terms of SLA queue priority, so `sync_staging()` is shared by both the `orders` and `pallets` routers rather than duplicated. It's the only cross-tool coupling in the backend. `auth.py` is a similar cross-cutting exception, applied at the `include_router()` call sites in `main.py` rather than baked into each router.

## Database schema (v1)

```sql
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    client_name TEXT NOT NULL,
    order_number TEXT NOT NULL,
    sla_due_date DATE NOT NULL,
    position FLOAT NOT NULL,       -- sort key for drag-and-drop reordering
    archived_at TIMESTAMPTZ,       -- set when every pallet on the order is completed; NULL = active
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE pallets (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    pallet_id TEXT NOT NULL UNIQUE,
    rack_location TEXT,
    status TEXT NOT NULL DEFAULT 'backlog',  -- backlog | staged | in_progress | completed
    created_at TIMESTAMPTZ DEFAULT now()
);
```

Note on `position`: uses a float "sort key" approach rather than sequential integers, so reordering via drag-and-drop only needs to update the one row being moved (new value = average of its new neighbors' positions), not renumber the whole table.

## Testing

- Backend: pytest, in `backend/tests/`. Run via `npm run test:backend` (wraps `docker-compose exec backend pytest`) — the backend container must already be up.
- `conftest.py` points `DATABASE_URL` at a throwaway temp-file SQLite DB *before* any `app.*` module is imported (import order matters — `app/database.py` reads the env var at import time), so tests never touch the real Postgres data. A `reset_db` autouse fixture drops/recreates all tables before every test for isolation. SQLite foreign-key enforcement is off by default, so a `PRAGMA foreign_keys=ON` connect listener is registered to make cascade-delete behavior match Postgres.
- `test_staging.py` unit-tests `sync_staging()` directly (no HTTP layer) — the auto-stage/revert/archive rules. `test_orders.py` / `test_pallets.py` go through the real FastAPI routes via `TestClient`, including a regression test for a bug found during manual testing (an archived order's `position` used to leak into new orders' position math). `test_auth.py` covers the `X-API-Key` gate.
- `conftest.py` also sets `BACKEND_API_KEY` before imports (same reasoning as `DATABASE_URL`) and the `client` fixture's `TestClient` is constructed with that key as a default header, so existing tests didn't each need updating when the backend auth gate was added.
- No frontend test setup yet (no framework installed) — UI changes are still verified manually via a real browser (Playwright-driven Chrome) rather than automated tests.

## Current status

- Repo scaffolded: Next.js frontend, FastAPI backend, Docker Compose for backend + local Postgres — all confirmed working locally (`/health` endpoint returns OK).
- `.gitignore` in place (excludes `venv/`, `node_modules/`, `.next/`, `.env*`).
- Backend done: Orders/SLA queue (models, schemas, router, drag-and-drop reorder) and the pallet Kanban/staging system (models, schemas, `staging.py`, `pallets` router) — verified against real Postgres via curl, including the full auto-stage/revert/archive cascade. Covered by pytest (see Testing above).
- Frontend done: SLA queue page (order form, drag-and-drop queue) at `/`, pallet Kanban board at `/pallets` — both verified in a real browser.
- Outbound pallet board + floor map view were built, then reverted (see Deferred/reverted above) — not present in the current codebase.
- Auth done: frontend password gate + backend API key (see Tech stack above). Frontend routes live under `app/(app)/` (has the nav + logout) as a route group separate from `app/login/` (no nav) — needed because rendering the logout button unconditionally on `/login` created a real bug (an ambiguous second `type="submit"` button on the page), not just a cosmetic issue.
- No Alembic — schema changes to already-existing local tables need a manual `ALTER TABLE` (done once for `pallets.status` and `orders.archived_at`); `Base.metadata.create_all()` only creates missing tables, never alters existing ones. On a brand-new Supabase database this isn't an issue — `create_all()` bootstraps the full schema on first backend startup with nothing pre-existing to migrate.
- Deployment prep done: `backend/Dockerfile`'s `CMD` runs without `--reload` (dev-only) and binds to Railway's injected `$PORT` (shell-form CMD so the env var expands, falling back to `8000` when unset). `docker-compose.yml` overrides `command:` locally to add `--reload` back, paired with its existing `./backend:/app` bind mount — the image itself stays production-safe. Concrete deploy steps (Supabase → Railway → Vercel, env vars per environment) are in README's Deployment section, not duplicated here.
- **Next step**: none of Version 1's remaining scope is currently planned — check with the user before starting new feature work. The app has not actually been deployed yet — README's Deployment section documents the steps, but no one has run through them.
