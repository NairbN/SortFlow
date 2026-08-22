# SortFlow — Project Context

## What this is

SortFlow is a suite of internal tools for the sort team at DMD Systems Recovery, an IT asset disposition (I-TAD) warehouse. It's built as a solo portfolio project (seeded/fake data, no real company data), with the long-term goal of pitching a similar system internally at DMD once it's proven out.

## The problem it solves

The **primary** problem is replacing a manually maintained SLA spreadsheet. Right now, one sort team member manually tracks incoming orders and their due dates in a spreadsheet, and the team references it to decide what to work on next. SortFlow replaces that spreadsheet with a live, shared tool.

Secondary (lower priority, "nice to have" polish) problems:

- Reducing outbound pallet mix-ups (rare in practice, but still a source of confusion)
- Making it faster to find where an outbound pallet physically is, via a visual floor map instead of a list

## How the real warehouse operation works (background context)

- Pallets arrive and get a pallet ID like `PLT-00001`, then get racked at a location like `CA01-RCK01`.
- Orders are prioritized by an SLA due date; an order can span multiple pallets.
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
   - No completion tracking in v1 (that's a "nice to have," possibly gamified, for later — not core)
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
│   └── routers/
│       ├── orders.py
│       └── outbound_categories.py
├── Dockerfile
├── requirements.txt
```

## Database schema (v1)

```sql
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    client_name TEXT NOT NULL,
    order_number TEXT NOT NULL,
    sla_due_date DATE NOT NULL,
    position FLOAT NOT NULL,       -- sort key for drag-and-drop reordering
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE pallets (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    pallet_id TEXT NOT NULL UNIQUE,
    rack_location TEXT,
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
- Initial scaffold committed and pushed to `github.com/NairbN/SortFlow`.
- **Next step**: build out the SQLAlchemy models, Pydantic schemas, and FastAPI routers for the Orders/SLA queue tool first (flagship feature), then the outbound categories tool.
