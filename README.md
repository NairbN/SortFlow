# SortFlow

Internal tools for the sort team at an IT asset disposition (ITAD) warehouse.

## Why this exists

Right now, one person on the sort team manually tracks incoming orders and their SLA due dates in a spreadsheet, and the rest of the team references it to decide what to work on next. That spreadsheet is the single point of failure this project replaces: SortFlow is a live, shared tool the whole team can see and update in real time instead.

It's a solo portfolio project built against a real workplace's actual workflow (seeded/fake data only, no real company data), with the eventual goal of pitching something like it internally once it's proven out. It's explicitly an **accessory app** — it complements the sort team's existing scanning/tracking system rather than replacing it, and it's scoped to the sort team only (not the downstream audit team).

## See it in action

![Full SortFlow walkthrough: reprioritizing the SLA queue, watching pallet staging cascade automatically, and protecting in-progress work from reprioritization](docs/demo-full-walkthrough.gif)

This is the whole loop end to end, captured against the app actually running (not mocked):
1. A low-urgency order gets dragged to the top of the SLA queue, overriding the default due-date sort
2. Clicking over to the Pallet Board shows that order's pallets auto-staged themselves, while the order that lost the #1 spot has its untouched pallets fall back to Backlog
3. A sorter drags one of those newly-staged pallets into In Progress
4. Back in the SLA queue, the original top order reclaims #1 — and back on the Pallet Board, the pallet already In Progress **stays exactly where it is**, while the other still-staged pallet reverts to Backlog. Reprioritizing never disturbs work someone's already started.
5. A sorter finishes a pallet and drags it into Completed — it stays put and the order stays active, since it still has another pallet outstanding. (Complete every pallet on an order and the order archives itself off both boards automatically — not shown in the clip above, but see the Pallet Kanban Board section below.)

## What's implemented

**SLA Queue** (`/`) — the flagship feature.
- Log a new order: client name, order number, SLA due date, and one or more pallet IDs
- Work queue sorted by priority, with drag-and-drop manual reordering that sticks for everyone until someone drags again (it doesn't silently revert to due-date order)
- Built with optimistic UI, so a drag reorders instantly while the change saves in the background

**Pallet Kanban Board** (`/pallets`) — tracks each pallet through `backlog → staged → in_progress → completed`.
- Only the #1 priority order's pallets auto-promote to `staged`; if an order loses the #1 spot, its untouched staged pallets fall back to `backlog` (anything already in progress or completed is never touched)
- Once every pallet on an order is completed, the order is archived and disappears from both boards automatically
- Sorters can still drag any card to any column manually at any time — the automation just sets a sensible default

Both pages talk to a FastAPI backend backed by Postgres, and both have been manually verified end-to-end in a real browser (not just unit-tested).

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | Next.js (TypeScript, Tailwind, App Router) |
| Backend | FastAPI |
| Database | Postgres (Docker Compose locally; Supabase in production) |
| Drag-and-drop | [@dnd-kit](https://dndkit.com/) |
| Testing | pytest (backend) |
| Orchestration | Docker + Docker Compose — deliberately no Kubernetes, overkill for this scale |

The frontend isn't containerized on purpose — it runs locally via `npm run dev` so hot reload stays fast, while the backend and database run in Docker.

## Getting started

**Prerequisites:** Docker + Docker Compose, Node.js (a recent LTS), and `git`.

```bash
git clone <this repo>
cd SortFlow
```

Create `frontend/.env.local`:
```
BACKEND_URL=http://localhost:8000
```

Install frontend dependencies, then start everything with one command from the repo root:
```bash
npm install --prefix frontend
npm run dev
```
This brings up the backend + Postgres in Docker (detached), then runs the frontend dev server in the foreground at [localhost:3000](http://localhost:3000). The backend is reachable directly at [localhost:8000](http://localhost:8000) (`/docs` gets you the interactive FastAPI Swagger UI).

Other useful commands, all run from the repo root:
```bash
npm run seed          # seed the SLA queue with realistic demo orders
npm run test:backend  # run the backend test suite
npm run logs           # tail backend logs
npm run down           # stop the backend + database containers
```

## Testing

Backend logic — the SLA queue's position math and the pallet Kanban board's auto-stage/revert/archive cascade — is covered by a pytest suite in `backend/tests/`, run via `npm run test:backend`. Tests run against an isolated temp-file SQLite database (never the real dev data), and include regression coverage for at least one real bug caught during manual testing.

There's no frontend test framework set up yet; UI changes are verified manually in a real browser instead.

## Project structure

```
backend/
├── app/
│   ├── main.py
│   ├── database.py
│   ├── models/          # SQLAlchemy models, one file per tool
│   ├── schemas/          # Pydantic schemas, one file per tool
│   ├── staging.py        # shared SLA-priority-driven pallet staging logic
│   └── routers/          # one router per tool
├── tests/
├── scripts/seed.sh       # demo data seed script
└── Dockerfile

frontend/
├── app/                  # Next.js App Router pages
├── components/
└── lib/                  # shared types, API calls, and Server Functions
```

The backend is deliberately modular — each tool (SLA queue, pallet Kanban, and whatever comes next) owns its own models/schemas/router, so new tools can be added without touching existing ones. `staging.py` is the one intentional exception: pallet staging is defined entirely in terms of SLA queue priority, so that logic is shared rather than duplicated.

## Roadmap

- **Model lookup tool** — an AI agent that looks up an unfamiliar asset's model number and determines whether it's above or below the resale cutline, grounded in the team's actual cutline spreadsheet and reference documents. Currently being scoped as a Microsoft Copilot Studio agent rather than in-repo code, so it won't show up in this codebase directly.
- An **outbound pallet board + warehouse floor map** were previously built (including an interactive pan/zoom floor plan) and then deliberately reverted — not pursued for now. If revisited, it'll be re-scoped from scratch rather than restored from git history.
- No authentication yet. The plan is a simple shared password gate rather than per-user accounts, since the whole team is meant to see and edit the same shared state.
- No production deployment yet (planned: Vercel for the frontend, Supabase for Postgres).

## License

MIT — see [LICENSE](LICENSE).
