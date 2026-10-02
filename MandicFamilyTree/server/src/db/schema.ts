import type { DatabaseSync } from "node:sqlite";

// A single idempotent schema script is enough at this project's scale —
// no separate migration-runner/versioning needed yet. Re-running this is safe.
const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS people (
  id               INTEGER PRIMARY KEY,
  first_name       TEXT NOT NULL,
  last_name        TEXT,
  maiden_name      TEXT,
  gender           TEXT,
  date_of_birth    TEXT,
  date_of_death    TEXT,
  residency        TEXT,
  note             TEXT,
  profile_pic_url  TEXT,
  created_by       INTEGER REFERENCES users(id),
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at       TEXT
);

-- A "branch" is a fully separate family line: a group of people (and the
-- relationships between them) that's shown/managed independently of any
-- other branch. root_person_id is the entry point the Tree/Focus views
-- start from for that branch — set automatically to whichever person is
-- the first one added to it (see models/branches.ts), left NULL for a
-- brand-new, still-empty branch.
CREATE TABLE IF NOT EXISTS branches (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  name             TEXT NOT NULL,
  root_person_id   INTEGER REFERENCES people(id),
  photo_url        TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS users (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  email             TEXT NOT NULL UNIQUE,
  password_hash     TEXT NOT NULL,
  display_name      TEXT,
  role              TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'editor', 'viewer')),
  linked_person_id  INTEGER REFERENCES people(id),
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS relationships (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  person_a_id    INTEGER NOT NULL REFERENCES people(id),
  person_b_id    INTEGER NOT NULL REFERENCES people(id),
  type           TEXT NOT NULL CHECK (type IN ('parent_of', 'spouse_of')),
  start_date     TEXT,
  end_date       TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (person_a_id, person_b_id, type)
);

CREATE TABLE IF NOT EXISTS media (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  person_id     INTEGER NOT NULL REFERENCES people(id),
  file_url      TEXT NOT NULL,
  kind          TEXT NOT NULL CHECK (kind IN ('photo', 'document')),
  caption       TEXT,
  uploaded_by   INTEGER REFERENCES users(id),
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_relationships_person_a ON relationships(person_a_id);
CREATE INDEX IF NOT EXISTS idx_relationships_person_b ON relationships(person_b_id);
CREATE INDEX IF NOT EXISTS idx_media_person ON media(person_id);
CREATE INDEX IF NOT EXISTS idx_people_deleted_at ON people(deleted_at);
`;

// people.branch_id is added via ALTER TABLE below rather than in the
// CREATE TABLE above — `people` already existed (with real data) before
// branches did, and SQLite has no "ADD COLUMN IF NOT EXISTS", so this
// checks pragma_table_info first to stay idempotent across repeated runs.
function ensurePeopleBranchColumn(db: DatabaseSync): void {
  const columns = db.prepare(`SELECT name FROM pragma_table_info('people')`).all() as { name: string }[];
  if (columns.some((c) => c.name === "branch_id")) return;
  db.exec(`ALTER TABLE people ADD COLUMN branch_id INTEGER REFERENCES branches(id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_people_branch_id ON people(branch_id)`);
}

// Same reasoning as ensurePeopleBranchColumn above — `branches` itself may
// already exist (from before photo_url was added) on a database that's
// upgrading in place.
function ensureBranchesPhotoColumn(db: DatabaseSync): void {
  const columns = db.prepare(`SELECT name FROM pragma_table_info('branches')`).all() as { name: string }[];
  if (columns.some((c) => c.name === "photo_url")) return;
  db.exec(`ALTER TABLE branches ADD COLUMN photo_url TEXT`);
}

// Self-healing backfill: anything that's ever ended up with no branch
// (a pre-existing database on its first run after this column was added,
// or data inserted directly by the seed script, which doesn't know about
// branches) gets swept into one catch-all branch rather than becoming
// invisible to every branch-filtered view. Safe to run on every boot —
// it's a no-op once nothing is left unassigned.
function backfillDefaultBranch(db: DatabaseSync): void {
  const { count } = db
    .prepare(`SELECT COUNT(*) as count FROM people WHERE branch_id IS NULL`)
    .get() as { count: number };
  if (count === 0) return;

  const existing = db.prepare(`SELECT id FROM branches ORDER BY id ASC LIMIT 1`).get() as
    | { id: number }
    | undefined;
  const branchId =
    existing?.id ??
    Number(db.prepare(`INSERT INTO branches (name) VALUES ('Mandić')`).run().lastInsertRowid);

  db.prepare(`UPDATE people SET branch_id = @branchId WHERE branch_id IS NULL`).run({ branchId });

  const branch = db.prepare(`SELECT root_person_id FROM branches WHERE id = @branchId`).get({
    branchId,
  }) as { root_person_id: number | null };
  if (branch.root_person_id == null) {
    const root = db
      .prepare(
        `SELECT id FROM people WHERE branch_id = @branchId AND deleted_at IS NULL ORDER BY id ASC LIMIT 1`
      )
      .get({ branchId }) as { id: number } | undefined;
    if (root) {
      db.prepare(`UPDATE branches SET root_person_id = @rootId WHERE id = @branchId`).run({
        rootId: root.id,
        branchId,
      });
    }
  }
}

export function runMigrations(db: DatabaseSync): void {
  db.exec(SCHEMA_SQL);
  ensurePeopleBranchColumn(db);
  ensureBranchesPhotoColumn(db);
  backfillDefaultBranch(db);
}
