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

**ID format:** `order_number` is `ORD-00000` (five digits). Inbound `pallet_id` is `PLT-0000000` (seven digits). Enforced by a Pydantic `Field(pattern=...)` on `OrderCreate`/`PalletCreate` (`backend/app/schemas/`), so any client bypassing the frontend (`seed.sh`, direct API calls) still gets a 422 for a malformed ID. `frontend/components/IdInput.tsx` makes hitting that pattern automatic in the UI rather than something a user has to get right by hand — see Tech stack below.
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
- **Database**: Postgres — Supabase in production, plain Postgres via Docker Compose for local dev. Same connection-string-based setup for both; swap the `DATABASE_URL` env var between environments. (Live updates are handled by a custom WebSocket, not Supabase Realtime — see below; local dev doesn't run real Supabase, so anything Supabase-specific wouldn't work there anyway.)
- **Local dev**: Docker Compose runs the backend + local Postgres. The Next.js frontend runs locally via `npm run dev` (NOT Dockerized — would slow down hot reload for no benefit).
- **Auth**: No per-user accounts in v1. Two layers, both shared secrets (not per-user):
  - **Frontend**: `frontend/proxy.ts` (Next 16's renamed `middleware.ts`; defaults to the Node.js runtime, not Edge-only) gates every route except `/login`. Session is a cookie holding a SHA-256 hash of the shared `SITE_PASSWORD` env var (not the plaintext password), checked against a freshly-computed hash on every request — no session store needed.
  - **Backend**: `backend/app/auth.py`'s `require_api_key` dependency, applied per-router at the `include_router()` call in `main.py` (not app-wide), so `/health` stays exempt without special-casing. Checks an `X-API-Key` header against `BACKEND_API_KEY` via `hmac.compare_digest` (constant-time, avoids timing attacks). The browser never calls the backend directly — every request comes from the Next.js server via `frontend/lib/backend.ts`'s `backendFetch()` wrapper, which attaches the header automatically — so this is service-to-service auth, not a second user-facing login. `backend/scripts/seed.sh` also needs this header since it talks to the API directly.
- **Rate limiting**: both login paths have a matching best-effort limiter (10 failed attempts/IP/60s, then 429) — `backend/app/rate_limit.py` (in-memory, reliable since Railway runs the backend as one persistent process) and `frontend/lib/rate-limit.ts` (also in-memory, but only best-effort — resets on a Vercel serverless cold start and isn't shared across instances). Backend tests reset the module-level dict via an autouse `reset_rate_limiter` fixture in `conftest.py` so failed-attempt counts (all `TestClient` requests share one fake IP) don't leak between tests.
- **API docs exposure**: FastAPI's built-in `/docs`, `/redoc`, `/openapi.json` sit outside the `require_api_key` gate (it's per-router, not app-wide) and are publicly reachable by default — not sensitive since the real routes still require the key, but `app/main.py` disables all three when `ENVIRONMENT=production` (unset/anything else = dev, docs stay on). Set `ENVIRONMENT=production` on Railway; local Docker Compose leaves it unset on purpose.
- **Real-time updates**: a custom WebSocket at `backend/app/ws.py`'s `/ws` route, not Supabase Realtime — chosen because Supabase Realtime only works against a real Supabase project (local dev's plain Postgres has no realtime server), and because Vercel's serverless functions can't hold a persistent connection, so a proxy-through-Next.js design wasn't viable either way. The browser connects **directly** to the Railway backend for this one channel (`frontend/components/RealtimeListener.tsx`, using `NEXT_PUBLIC_BACKEND_WS_URL`) — the one deliberate exception to "browser never calls the backend directly." This is safe because the socket carries zero order/pallet data: the backend broadcasts a content-free `"changed"` string whenever `orders`/`pallets` mutate (`ConnectionManager.notify_changed()`, called from each mutating route after its commit), and the frontend's only reaction is `router.refresh()` — the actual data still only ever flows through the existing `BACKEND_API_KEY`-gated REST path. No auth on `/ws` itself as a result; a `MAX_CONNECTIONS` cap (50) is the only abuse guard. Route handlers are sync `def`s, so broadcasting from them needs the event loop captured in `main.py`'s `lifespan` and handed to `asyncio.run_coroutine_threadsafe()` — plain `await` isn't reachable from a thread-pooled sync function.
- **ID input formatting**: `frontend/components/IdInput.tsx` auto-formats order/pallet IDs live as digits are typed (e.g. typing `4201` shows `PLT-0004201`), used for `order_number` (`NewOrderForm`) and each pallet row's `pallet_id`. It tracks the typed digits as their own React state rather than re-deriving them from the padded display — parsing "how many of these zeros are real vs. padding" back out of `PLT-0000042` is genuinely ambiguous, so instead every keystroke is intercepted at `onKeyDown` (digit → append, backspace/delete → drop the last raw digit, anything else printable → blocked) and the display is recomputed fresh from that state each time. Cursor is pinned to the end after every change (`useLayoutEffect`), matching the field's only real editing pattern — append/remove from the end, not edit-in-the-middle. `onChange` is kept as a fallback (some mobile virtual keyboards don't fire reliable `keydown`), and `onPaste` extracts digits from whatever was pasted. Backend validation (previous bullet) is what actually enforces the format; this component exists so a user doesn't need to know the pattern to hit it.
- **Rack location**: `frontend/components/RackLocationSelect.tsx`, a searchable combobox in `NewOrderForm`, not free text and not a plain `<select>` — a native select's typeahead only matches from the *start* of each option's text, and every rack option starts with "CA", so typing the digits that actually distinguish them (e.g. "12" for `CA01-RCK12`) wouldn't jump anywhere with one. Instead it's a text input + filtered `<ul>` dropdown: typing filters `RACK_LOCATIONS` by substring match anywhere in the option (so "12" finds every rack containing "12"), but what's actually submitted (a hidden `input[name="rack_location"]`) only ever updates to an exact option selected by click/Enter — typed text that doesn't match anything, or that's abandoned via Escape/blur, reverts the visible field to the last real selection rather than submitting free text. `onFocus` selects the field's existing text so clicking in and typing immediately starts a fresh search instead of inserting into the middle of the current value (a real bug caught via a dark-mode screenshot during manual testing - typing "5" produced "CA Commodity Floo5r"). `RACK_LOCATIONS` (`frontend/lib/rackLocations.ts`) is generated as `CA01-RCK01` through `CA01-RCK{RACK_COUNT}` — only one zone (`CA01`) actually exists, not `CA02`/`CA03` as an earlier placeholder assumed. Rack numbers are zero-padded to a 2-digit minimum (`padStart(2, "0")`), which naturally rolls over to 3 digits past `RCK99` (`RCK100`, `RCK101`, ...) rather than staying fixed-width - `RACK_COUNT` (currently 999, so both 2- and 3-digit racks exist) is still a placeholder pending the real warehouse's actual highest rack number. Defaults to `"CA Commodity Floor"` (a real stored string, not `null`) for the shared no-rack floor area described above — older seed data instead used a literal `null` for the same concept, so pre-existing pallets show no rack-location line on their Kanban card while anything created through the form now shows "CA Commodity Floor" explicitly. Both are valid, just a small historical inconsistency in demo data, not a bug.
- **Days-left/overdue labels**: `frontend/lib/dates.ts`'s `daysUntilDue()` takes `today` as a parameter rather than calling `new Date()` itself, and `frontend/lib/TodayContext.tsx` computes it exactly once, server-side, in `app/(app)/layout.tsx` and threads it through Context to `OrderCard`/`KanbanCard`. This fixes a real hydration bug found in production: those two are Client Components that also render during SSR, so if each called `new Date()` independently, the server's clock (Railway, UTC) and a viewer's local clock could disagree on the calendar date — e.g. already the next day in UTC but not yet locally — producing a different days-left number (and therefore different text) between the server-rendered HTML and the client's hydration pass, which React surfaces as a hydration mismatch error. A shared `today` also means every viewer sees the same "9d overdue" regardless of their own timezone, which is more correct for a tool the whole team looks at together.
- **Orchestration**: Docker + Docker Compose only. No Kubernetes — deliberately decided against it as overkill for this project's scale.

## Design principle: modularity

Structure the backend so each "tool" (SLA queue, future model lookup, etc.) is self-contained — its own models, schemas, and router — so new tools can be added later without touching existing code. See backend folder structure below.

```
backend/
├── app/
│   ├── main.py
│   ├── database.py
│   ├── auth.py
│   ├── rate_limit.py
│   ├── ws.py
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
│   ├── test_staging.py
│   └── test_ws.py
├── alembic/
│   ├── env.py
│   └── versions/
├── alembic.ini
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
- `test_staging.py` unit-tests `sync_staging()` directly (no HTTP layer) — the auto-stage/revert/archive rules. `test_orders.py` / `test_pallets.py` go through the real FastAPI routes via `TestClient`, including a regression test for a bug found during manual testing (an archived order's `position` used to leak into new orders' position math). `test_auth.py` covers the `X-API-Key` gate. `test_ws.py` covers `/ws`: that it accepts connections, and that creating an order / updating a pallet status broadcasts `"changed"` to a connected client — verified via `TestClient`'s `websocket_connect()`, which also confirms the sync-route-to-event-loop broadcast bridge (`asyncio.run_coroutine_threadsafe`) actually works under test, not just in a real server.
- `conftest.py` also sets `BACKEND_API_KEY` before imports (same reasoning as `DATABASE_URL`) and the `client` fixture's `TestClient` is constructed with that key as a default header, so existing tests didn't each need updating when the backend auth gate was added.
- No frontend test setup yet (no framework installed) — UI changes are still verified manually via a real browser (Playwright-driven Chrome) rather than automated tests.

## Current status

- Repo scaffolded: Next.js frontend, FastAPI backend, Docker Compose for backend + local Postgres — all confirmed working locally (`/health` endpoint returns OK).
- `.gitignore` in place (excludes `venv/`, `node_modules/`, `.next/`, `.env*`).
- Backend done: Orders/SLA queue (models, schemas, router, drag-and-drop reorder) and the pallet Kanban/staging system (models, schemas, `staging.py`, `pallets` router) — verified against real Postgres via curl, including the full auto-stage/revert/archive cascade. Covered by pytest (see Testing above).
- Frontend done: SLA queue page (order form, drag-and-drop queue) at `/`, pallet Kanban board at `/pallets` — both verified in a real browser.
- Light/dark mode done: `next-themes` drives a `.dark` class on `<html>` (Tailwind v4's `@custom-variant dark` in `globals.css`, switched from the default OS-only `prefers-color-scheme` strategy), toggled via `components/ThemeToggle.tsx` in the nav and on the login page. `ThemeToggle` defers its real render one client-only tick (`mounted` state set in a `useEffect`, with a targeted `eslint-disable` for `react-hooks/set-state-in-effect`) since the theme-setting inline script `next-themes` injects runs before hydration — rendering the real button immediately would mismatch the server's output.
- Real-time updates done (see Tech stack above for the design). Verified with two separate logged-in browser contexts open on `/pallets` at once: a pallet status change made by a third party (neither open tab) appeared in both, live, with no manual reload — confirming the full path (broadcast → browser WebSocket → `router.refresh()` → re-render) actually works, not just that the pieces exist individually.
- Order/pallet ID validation + autocomplete done: backend rejects malformed `order_number`/`pallet_id` with a 422 (see ID format above), and `IdInput` (see Tech stack above) makes the frontend produce a correctly-formatted ID by construction rather than relying on the user typing the pattern correctly by hand.
- Outbound pallet board + floor map view were built, then reverted (see Deferred/reverted above) — not present in the current codebase.
- Auth done: frontend password gate + backend API key (see Tech stack above). Frontend routes live under `app/(app)/` (has the nav + logout) as a route group separate from `app/login/` (no nav) — needed because rendering the logout button unconditionally on `/login` created a real bug (an ambiguous second `type="submit"` button on the page), not just a cosmetic issue.
- Migrations via Alembic (`backend/alembic/`), replacing the earlier manual-`ALTER TABLE` approach (previously needed twice, for `pallets.status` and `orders.archived_at`, back when `Base.metadata.create_all()` was the only schema-creation mechanism — it only ever creates missing tables, never alters existing ones). `app/main.py` no longer calls `create_all()` at all; schema is entirely Alembic's responsibility now.
  - `alembic/env.py` reads `DATABASE_URL` from the same env var as the rest of the app (not a static URL in `alembic.ini`) and points `target_metadata` at `app.database.Base.metadata`, importing `app.models.order`/`app.models.pallet` so their tables register before `--autogenerate` inspects it.
  - Both `backend/Dockerfile`'s `CMD` and `docker-compose.yml`'s local `command:` run `alembic upgrade head` before starting uvicorn — every boot, not a separate release-phase step. Safe to run unconditionally: `upgrade head` is a no-op once already there, which is what happens on nearly every local dev restart.
  - The initial migration (`alembic/versions/05fe15b7ee99_*.py`) was autogenerated against a genuinely empty scratch database (not the real dev DB, which already had these tables) to get a clean "create both tables" migration, then the real local dev DB was brought in sync via `alembic stamp head` (marks it as already at that revision without re-running DDL, since its existing tables already matched). A brand-new Supabase database instead runs the migration for real on first Railway boot — verified by pointing the built image at a genuinely fresh Postgres database and confirming it created the schema and served requests correctly.
  - Going forward, a model change means: edit the model, `docker-compose exec backend alembic revision --autogenerate -m "..."`, review the generated file, commit it. It applies automatically on the next container boot (local and Railway alike).
  - Tests still use `Base.metadata.create_all()`/`drop_all()` directly against throwaway SQLite (see Testing below) — intentionally bypassing Alembic for speed and isolation; that path doesn't run migrations and never has.
- Deployment prep done: `backend/Dockerfile`'s `CMD` runs without `--reload` (dev-only) and binds to Railway's injected `$PORT` (shell-form CMD so the env var expands, falling back to `8000` when unset). `docker-compose.yml` overrides `command:` locally to add `--reload` back, paired with its existing `./backend:/app` bind mount — the image itself stays production-safe. Concrete deploy steps (Supabase → Railway → Vercel, env vars per environment) are in README's Deployment section, not duplicated here.
- Hardening pass done on top of the base auth: per-IP rate limiting on both login paths and `ENVIRONMENT`-gated API docs (see Auth bullet above under Tech stack). Verified by rebuilding the backend image and hitting a standalone container directly (not just through docker-compose's bind mount) with `ENVIRONMENT=production` set, to confirm the baked-in image behaves correctly and not just the live-reloading dev container.
- Deployed to production and verified end-to-end (real browser: login → SLA queue page → confirmed it reaches the real Railway backend and Supabase database, not a mock). Frontend on Vercel (`nairbn/frontend` project, GitHub-connected for auto-deploy on push to `main`), backend on Railway (`SortFlow` project, `backend` service, also GitHub-connected), Postgres on Supabase (connected via the session/transaction pooler, not the direct connection string, since this Railway service has no IPv6 egress and Supabase's direct connection is IPv6-only on newer projects). Railway's infra (service config, non-secret env vars) is defined in `.railway/railway.ts` — see the Deployment section in README for the full setup. `railway config plan`/`config apply` have a CLI bug on this Windows/Git-Bash setup where they misread the invoking shell's `_` env var as the Railway executable; workaround is calling `node_modules/@railway/cli/bin/railway.exe` directly instead of the `railway`/`railway.cmd` shims (plain `railway` is fine for every other subcommand).
- Two real production incidents hit and fixed post-launch, both worth knowing before touching deployment again:
  - **Vercel built from the wrong directory.** The Vercel project's "Root Directory" setting was never actually set to `frontend` — my first deploy (`vercel --prod` run from inside `frontend/`) worked anyway since CLI-local deploys don't consult that setting, masking the problem. The next git-triggered deploy silently built from the repo root instead (installed only the root `package.json`'s minimal deps) and failed with "No Next.js version detected." Fixed via `vercel project update frontend --root-directory frontend`; a CLI deploy after that fix must run from the repo root with `--project frontend`, not from inside `frontend/` (the two conventions conflict once the setting is real).
  - **Backend crash-looped after a routine push.** Alembic's revision tracking got out of sync with the actual Supabase schema (likely a mid-migration retry after a transient failure), so every boot tried to re-run the initial migration and hit `relation "orders" already exists`, crash-looping. Fixed with `alembic stamp head` run against production (via `docker run` with the image's baked-in Alembic setup and production `DATABASE_URL`, not through Railway's own shell) — safe here because the tables already matched the target schema exactly; a real drift would need a different fix.
  - A stray, unrelated second Railway project (accidentally created during initial setup, also GitHub-connected) was polluting GitHub's Deployments UI with a confusing extra environment — deleted.
- **Next step**: none of Version 1's remaining scope is currently planned — check with the user before starting new feature work.
