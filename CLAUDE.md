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

**ID format convention:** `order_number` is `ORD-00000` (five digits). Inbound `pallet_id` is `PLT-0000000` (seven digits). Outbound pallet numbers (once that tool is built) are `OPLT-000000` (six digits). These are free-text fields (no backend validation enforcing the pattern), so this is a convention for seed data and manual entry, not a hard constraint.
- The sort team pulls pallets by order, unpacks them, and scans each asset to either an **outbound pallet** (commodity/recycling, grouped by category) or a **pending-wipe rack** (data-bearing/valuable items, headed to the audit team).
- Outbound pallets are per-category (e.g. laptops, wires, printers). Most categories have a fixed rack location that persists across pallet swaps. One exception: a shared "CA commodity" floor area with no rack, used by several categories.
- Audit team (not in scope for this app) handles grading, wiping, and staging for resale or teardown.

## Scope

This is explicitly an **accessory app** — it complements the sort team's existing scanning/tracking app, it does not replace it. It is scoped to the **sort team only** (not audit).

### Version 1 — in scope

Three tools, each independent/modular (not one monolithic app):

1. **Receiving / SLA queue** (flagship feature — most important)
   - Log new orders: client name, order ID, pallet ID(s), SLA due date
   - Work queue view, default sorted by earliest due date
   - Manual reordering via **drag-and-drop**, open to anyone on the sort team (no role restrictions in v1)
   - Manual order **persists** for everyone until someone drags again — it does not auto-revert to SLA-date sort
   - **Pallet Kanban board** (in scope as of the second build pass — originally deferred, pulled forward): each pallet carries a status — `backlog` → `staged` → `in_progress` → `completed` — shown as one global Kanban board across all active orders. Only the #1 order's `backlog` pallets auto-promote to `staged`; if an order loses the #1 spot, its still-`staged`-and-untouched pallets revert to `backlog` (pallets already `in_progress`/`completed` are never touched by this). When every pallet on an order reaches `completed`, the order is soft-archived (`archived_at` set) and disappears from both the SLA queue and the Kanban board. Sorters can drag any pallet card to any column at any time — the auto-staging just sets a sensible default, it doesn't lock anything.
2. **Outbound pallet board**
   - Shows the current active outbound pallet number per category, plus its rack location
   - Categories are **configurable**, not hardcoded (list includes things like laptops, monitors, AIOs, keyboards/mice, printers, AC adapters, wires, ethernet, steel, misc e-waste, toner, docking stations, telephones, etc.)
   - Updating this is just changing a text field per category when a new pallet replaces an old one — no status tracking, no automation
3. **Floor map view**
   - Visual warehouse floor plan (not a scrollable list) showing where each category's current outbound pallet lives
   - There's a reference image of the real warehouse layout to build from

### Version 2 — future, not in scope now

- Model lookup tool: solves the pain point of having to manually search up unfamiliar device models (is it data-bearing? above/below the resale cut line vs. eBay/documentation?) — currently done by sending a message in a chat. Keep this in mind for future modularity but do not build it yet.

## Tech stack

- **Frontend**: Next.js (TypeScript, Tailwind, App Router), deployed on Vercel
- **Backend**: FastAPI, containerized with Docker
- **Database**: Postgres — Supabase in production (also gives realtime updates), plain Postgres via Docker Compose for local dev. Same connection-string-based setup for both; swap the `DATABASE_URL` env var between environments.
- **Local dev**: Docker Compose runs the backend + local Postgres. The Next.js frontend runs locally via `npm run dev` (NOT Dockerized — would slow down hot reload for no benefit).
- **Auth**: No per-user accounts in v1. Simple shared password gate instead.
- **Orchestration**: Docker + Docker Compose only. No Kubernetes — deliberately decided against it as overkill for this project's scale.

## Design principle: modularity

Structure the backend so each "tool" (SLA queue, outbound pallet board, future model lookup, etc.) is self-contained — its own models, schemas, and router — so new tools can be added later without touching existing code. See backend folder structure below.

```
backend/
├── app/
│   ├── main.py
│   ├── database.py
│   ├── models/
│   │   ├── order.py
│   │   ├── pallet.py
│   │   └── outbound_category.py
│   ├── schemas/
│   │   ├── order.py
│   │   ├── pallet.py
│   │   └── outbound_category.py
│   ├── staging.py
│   └── routers/
│       ├── orders.py
│       ├── outbound_categories.py
│       └── pallets.py
├── Dockerfile
├── requirements.txt
```

`staging.py` is a deliberate, narrow exception to the one-router-per-tool rule: pallet staging is defined entirely in terms of SLA queue priority, so `sync_staging()` is shared by both the `orders` and `pallets` routers rather than duplicated. It's the only cross-tool coupling in the backend.

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

CREATE TABLE outbound_categories (
    id SERIAL PRIMARY KEY,
    category_name TEXT NOT NULL UNIQUE,
    current_pallet_number TEXT,
    rack_location TEXT,
    updated_at TIMESTAMPTZ DEFAULT now()
);
```

Note on `position`: uses a float "sort key" approach rather than sequential integers, so reordering via drag-and-drop only needs to update the one row being moved (new value = average of its new neighbors' positions), not renumber the whole table.

## Current status

- Repo scaffolded: Next.js frontend, FastAPI backend, Docker Compose for backend + local Postgres — all confirmed working locally (`/health` endpoint returns OK).
- `.gitignore` in place (excludes `venv/`, `node_modules/`, `.next/`, `.env*`).
- Backend done: Orders/SLA queue (models, schemas, router, drag-and-drop reorder), outbound pallet board, and the pallet Kanban/staging system (models, schemas, `staging.py`, `pallets` router) — all verified against real Postgres via curl, including the full auto-stage/revert/archive cascade.
- Frontend: SLA queue page done (order form, drag-and-drop queue, verified in a real browser) at `/`. Pallet Kanban board page not yet built.
- No Alembic — schema changes to already-existing local tables need a manual `ALTER TABLE` (done once for `pallets.status` and `orders.archived_at`); `Base.metadata.create_all()` only creates missing tables, never alters existing ones.
- **Next step**: build the pallet Kanban board frontend page (`/pallets` or similar), then the outbound pallet board frontend, then the floor map view.
