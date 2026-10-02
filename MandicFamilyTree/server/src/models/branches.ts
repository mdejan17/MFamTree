import { db, withTransaction } from "../db/connection";

export interface BranchRow {
  id: number;
  name: string;
  root_person_id: number | null;
  photo_url: string | null;
  created_at: string;
}

export interface BranchApiShape {
  id: number;
  name: string;
  rootPersonId: number | null;
  photoUrl?: string;
  createdAt: string;
  peopleCount: number;
}

function rowToApiShape(row: BranchRow, peopleCount: number): BranchApiShape {
  return {
    id: row.id,
    name: row.name,
    rootPersonId: row.root_person_id,
    photoUrl: row.photo_url ?? undefined,
    createdAt: row.created_at,
    peopleCount,
  };
}

export function listBranches(): BranchApiShape[] {
  const rows = db.prepare(`SELECT * FROM branches ORDER BY id ASC`).all() as unknown as BranchRow[];
  return rows.map((row) => {
    const { count } = db
      .prepare(`SELECT COUNT(*) as count FROM people WHERE branch_id = @id AND deleted_at IS NULL`)
      .get({ id: row.id }) as { count: number };
    return rowToApiShape(row, count);
  });
}

export function getBranch(id: number): BranchApiShape | undefined {
  const row = db.prepare(`SELECT * FROM branches WHERE id = @id`).get({ id }) as
    | BranchRow
    | undefined;
  if (!row) return undefined;
  const { count } = db
    .prepare(`SELECT COUNT(*) as count FROM people WHERE branch_id = @id AND deleted_at IS NULL`)
    .get({ id }) as { count: number };
  return rowToApiShape(row, count);
}

export function createBranch(name: string): BranchApiShape {
  const result = db.prepare(`INSERT INTO branches (name) VALUES (@name)`).run({ name });
  return getBranch(Number(result.lastInsertRowid))!;
}

// Deliberately a "soft" delete at the branch level: the branch row itself
// is removed, but its people are only unassigned (branch_id set to NULL),
// never touched otherwise — no person, relationship, or photo is deleted.
// Returns how many people were unassigned, so the caller (the confirm
// dialog) can tell the person what's about to happen before they commit.
export function deleteBranch(id: number): number {
  return withTransaction(() => {
    const result = db
      .prepare(`UPDATE people SET branch_id = NULL WHERE branch_id = @id`)
      .run({ id });
    db.prepare(`DELETE FROM branches WHERE id = @id`).run({ id });
    return Number(result.changes);
  });
}

// The harder sibling of deleteBranch above: instead of unassigning people,
// it soft-deletes every one of them — the exact same mechanism (and
// reversibility) as deleting a person one at a time via DELETE /people/:id
// — before removing the branch row. Irreversible from the UI's point of
// view, which is why the frontend gates this behind a typed "DELETE"
// confirmation rather than the lighter inline prompt deleteBranch uses.
// Returns how many people were soft-deleted.
export function purgeBranch(id: number): number {
  return withTransaction(() => {
    // branch_id has to be cleared too (not just deleted_at set), or the
    // DELETE below trips the people.branch_id foreign key — a soft-deleted
    // person still has to stop pointing at a branch row that's about to
    // stop existing.
    const result = db
      .prepare(
        `UPDATE people SET deleted_at = datetime('now'), branch_id = NULL WHERE branch_id = @id AND deleted_at IS NULL`
      )
      .run({ id });
    db.prepare(`DELETE FROM branches WHERE id = @id`).run({ id });
    return Number(result.changes);
  });
}

// Called right after a person is created with a branchId — the very first
// person ever added to an empty branch automatically becomes its root
// (the entry point the Tree/Focus views open to), with no extra UI needed.
// Only fires once per branch: later additions never overwrite an
// already-set root.
export function setBranchRootIfUnset(branchId: number, personId: number): void {
  db.prepare(
    `UPDATE branches SET root_person_id = @personId WHERE id = @branchId AND root_person_id IS NULL`
  ).run({ branchId, personId });
}

// Unlike setBranchRootIfUnset above (which only ever fires automatically
// for an empty branch's very first person), this unconditionally overwrites
// whatever root was set before — used when "Add Parent" on the current root
// creates a new person above them, so the tree's single entry point moves
// up to that new person instead of staying stuck on their child.
export function setBranchRoot(id: number, personId: number): BranchApiShape | undefined {
  db.prepare(`UPDATE branches SET root_person_id = @personId WHERE id = @id`).run({ id, personId });
  return getBranch(id);
}

export function renameBranch(id: number, name: string): BranchApiShape | undefined {
  db.prepare(`UPDATE branches SET name = @name WHERE id = @id`).run({ id, name });
  return getBranch(id);
}

export function setBranchPhoto(id: number, photoUrl: string): BranchApiShape | undefined {
  db.prepare(`UPDATE branches SET photo_url = @photoUrl WHERE id = @id`).run({ id, photoUrl });
  return getBranch(id);
}
