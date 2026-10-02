# Tech stack

A single repo with two independent npm projects: a React frontend at the
root, and an Express API under `server/`. Both are TypeScript, built
separately, and deployed together onto one EC2 instance (see
`deploy/README.md`).

## Frontend (`/`)

- **React 19** + **TypeScript**, built with **Vite 7**.
- **React Router 7** (`HashRouter`) for client-side routing — every page
  lives under `src/dom/` (`Home`, `Overview`, `PersonProfile`,
  `BranchProfile`, `TreeFocus`, `Login`).
- **react-d3-tree** renders the main family tree (`Home.tsx`), with custom
  SVG node cards (`components/PersonCard.tsx`) instead of the library's
  default nodes.
- **D3** (`d3`) powers the hand-built "Constellation" Focus view
  (`components/FamTree.tsx`) — its own force-directed-style layout, pan/zoom
  and drag behavior, not react-d3-tree.
- No UI kit or CSS framework (no Tailwind/MUI/etc.) — styling is plain CSS
  **CSS Modules** per component (`*.module.css`), plus a few global
  stylesheets (`index.css`, `Tree.css`, `ContextualPopover.css`) for things
  shared across components.
- State/data flow is React Context, no Redux/Zustand:
  - `AuthContext` — current user + JWT.
  - `BranchContext` — the list of family branches, which one is active, and
    create/delete/purge/rename/re-root actions.
  - `AddUserPopupContext`, `HoveredPersonContext`, `TreeNodePositionContext`
    — small bits of cross-component UI state the tree/popover/add-person
    flow need to share.
  - `LocaleContext` — the bilingual (English / Serbian-Latin) i18n layer;
    all user-facing strings live in `src/i18n/translations.ts` behind a
    `t(key, vars?)` function.
- A tiny custom pub/sub (`src/events.ts`, just `window.CustomEvent` under
  the hood) lets unrelated components (the always-mounted "Add Person"
  popup, say) tell whichever page is open to refetch, without a bigger state
  library.
- Linting: **ESLint 9** (flat config) with `typescript-eslint`,
  `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`.

## Backend (`server/`)

- **Node.js 22+** (`engines.node >= 22.5.0`) + **Express 4** + TypeScript,
  compiled with `tsc` (plain CommonJS output, no bundler).
- **`node:sqlite`** — Node's own built-in, experimental SQLite driver
  (`DatabaseSync`). Deliberately *not* `better-sqlite3` or another native
  module, so there's nothing to compile on deploy. The whole database is one
  file (`server/data/family-tree.sqlite3`).
- Schema management is a single idempotent SQL script
  (`db/schema.ts`, `CREATE TABLE IF NOT EXISTS` + manual
  `pragma_table_info` checks before any `ALTER TABLE ADD COLUMN`, since
  SQLite has no `ADD COLUMN IF NOT EXISTS`) — no migration-framework/version
  table; re-running it is always safe.
- **JWT auth** (`jsonwebtoken`) + **bcryptjs** for password hashing. Roles
  are `admin` / `editor` / `viewer`, enforced per-route via
  `requireAuth`/`requireRole` middleware.
- **multer** handles photo/document uploads to local disk
  (`UPLOAD_DIR`, served back out at `/uploads/...`).
- **zod** validates every request body/params before it touches a model.
- **cors** + a small custom `ApiError`/error-handling middleware for
  consistent JSON error responses.
- Tests use Node's **built-in test runner** (`node:test` + `node:assert`),
  run with `tsx --test src/__tests__/*.test.ts` — no Jest/Vitest. Each test
  file spins up its own throwaway SQLite file in the OS temp dir.
- Dev server: **tsx watch** (no nodemon/ts-node-dev).

## Data model (high level)

`people` (soft-deleted via `deleted_at`, never hard-deleted by the app
itself), `relationships` (`parent_of` / `spouse_of` pairs), `branches` (an
independent family line — a branch's `root_person_id` is the tree's single
entry point, auto-set to the first person ever added to it, and movable
later via the "Add Parent" re-rooting feature), `media` (photos/documents
attached to a person), `users` (auth).

## Deployment

Single EC2 instance, no containers/orchestration: nginx serves the built
frontend (`dist/`) and reverse-proxies `/api` to the Node process, which
runs under **systemd** (auto-restart on crash/reboot), with **certbot** for
HTTPS and a daily cron `backup-db.sh` (a consistent SQLite backup copy) via
root's crontab. Full step-by-step in `deploy/README.md`.
