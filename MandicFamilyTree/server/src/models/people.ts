import { db } from "../db/connection";
import { setBranchRootIfUnset } from "./branches";

export interface PersonRow {
  id: number;
  first_name: string;
  last_name: string | null;
  maiden_name: string | null;
  gender: string | null;
  date_of_birth: string | null;
  date_of_death: string | null;
  residency: string | null;
  note: string | null;
  profile_pic_url: string | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  branch_id: number | null;
}

// Shaped to match the frontend's existing `Person` interface
// (src/data/mockDatabase.tsx) so the API can be dropped in without
// changing how the tree/profile components consume a person.
export interface PersonApiShape {
  uid: number;
  firstName: string;
  lastName: string;
  maidenName?: string;
  gender: string;
  dateOfBirth?: string;
  dateOfDeath?: string;
  residency?: string;
  note?: string;
  parentUid: number[];
  spouseUid: number[];
  offspringUid: number[];
  profilePic?: string;
  branchId?: number;
}

export function getParentIds(personId: number): number[] {
  return db
    .prepare(
      `SELECT person_a_id as id FROM relationships WHERE person_b_id = @personId AND type = 'parent_of'`
    )
    .all({ personId })
    .map((r) => (r as { id: number }).id);
}

export function getChildIds(personId: number): number[] {
  return db
    .prepare(
      `SELECT person_b_id as id FROM relationships WHERE person_a_id = @personId AND type = 'parent_of'`
    )
    .all({ personId })
    .map((r) => (r as { id: number }).id);
}

export function getSpouseIds(personId: number): number[] {
  return db
    .prepare(
      `SELECT CASE WHEN person_a_id = @personId THEN person_b_id ELSE person_a_id END as id
       FROM relationships
       WHERE type = 'spouse_of' AND (person_a_id = @personId OR person_b_id = @personId)`
    )
    .all({ personId })
    .map((r) => (r as { id: number }).id);
}

export function rowToApiShape(row: PersonRow): PersonApiShape {
  return {
    uid: row.id,
    firstName: row.first_name,
    lastName: row.last_name ?? "",
    maidenName: row.maiden_name ?? undefined,
    gender: row.gender ?? "",
    dateOfBirth: row.date_of_birth ?? undefined,
    dateOfDeath: row.date_of_death ?? undefined,
    residency: row.residency ?? undefined,
    note: row.note ?? undefined,
    parentUid: getParentIds(row.id),
    spouseUid: getSpouseIds(row.id),
    offspringUid: getChildIds(row.id),
    profilePic: row.profile_pic_url ?? undefined,
    branchId: row.branch_id ?? undefined,
  };
}

// branchId narrows the result to one branch — every page that renders a
// family tree (Overview's list, the Constellation Focus view) passes the
// currently active branch so one branch's people never leak into another's
// view. Omitting it (undefined) returns everyone, which only internal
// callers that already know what they're doing (the branch-deletion count,
// tests) should rely on.
export function listPeople(branchId?: number): PersonApiShape[] {
  const rows = (
    branchId === undefined
      ? db.prepare(`SELECT * FROM people WHERE deleted_at IS NULL ORDER BY id`).all()
      : db
          .prepare(`SELECT * FROM people WHERE deleted_at IS NULL AND branch_id = @branchId ORDER BY id`)
          .all({ branchId })
  ) as unknown as PersonRow[];
  return rows.map(rowToApiShape);
}

export function findPersonRow(id: number): PersonRow | undefined {
  return db
    .prepare(`SELECT * FROM people WHERE id = @id AND deleted_at IS NULL`)
    .get({ id }) as unknown as PersonRow | undefined;
}

export function getPerson(id: number): PersonApiShape | undefined {
  const row = findPersonRow(id);
  return row ? rowToApiShape(row) : undefined;
}

export interface CreatePersonInput {
  firstName: string;
  lastName?: string;
  maidenName?: string;
  gender?: string;
  dateOfBirth?: string;
  dateOfDeath?: string;
  residency?: string;
  note?: string;
  profilePic?: string;
  createdBy?: number;
  branchId?: number;
}

export function createPerson(input: CreatePersonInput): PersonApiShape {
  const result = db
    .prepare(
      `INSERT INTO people (first_name, last_name, maiden_name, gender, date_of_birth, date_of_death, residency, note, profile_pic_url, created_by, branch_id)
       VALUES (@firstName, @lastName, @maidenName, @gender, @dateOfBirth, @dateOfDeath, @residency, @note, @profilePic, @createdBy, @branchId)`
    )
    .run({
      firstName: input.firstName,
      lastName: input.lastName ?? null,
      maidenName: input.maidenName ?? null,
      gender: input.gender ?? null,
      dateOfBirth: input.dateOfBirth ?? null,
      dateOfDeath: input.dateOfDeath ?? null,
      residency: input.residency ?? null,
      note: input.note ?? null,
      profilePic: input.profilePic ?? null,
      createdBy: input.createdBy ?? null,
      branchId: input.branchId ?? null,
    });

  const personId = Number(result.lastInsertRowid);
  if (input.branchId !== undefined) {
    setBranchRootIfUnset(input.branchId, personId);
  }
  return getPerson(personId)!;
}

// branchId is excluded — reassigning an existing person to another branch
// isn't supported (see routes/people.ts), so it's never an updatable field.
export type UpdatePersonInput = Partial<Omit<CreatePersonInput, "createdBy" | "branchId">>;

const UPDATABLE_FIELDS: Record<keyof UpdatePersonInput, string> = {
  firstName: "first_name",
  lastName: "last_name",
  maidenName: "maiden_name",
  gender: "gender",
  dateOfBirth: "date_of_birth",
  dateOfDeath: "date_of_death",
  residency: "residency",
  note: "note",
  profilePic: "profile_pic_url",
};

export function updatePerson(id: number, input: UpdatePersonInput): PersonApiShape | undefined {
  const entries = Object.entries(input).filter(([, v]) => v !== undefined) as [
    keyof UpdatePersonInput,
    string
  ][];
  if (entries.length === 0) return getPerson(id);

  const setClause = entries.map(([key]) => `${UPDATABLE_FIELDS[key]} = @${key}`).join(", ");
  const params: Record<string, string | number | null> = { id };
  for (const [key, value] of entries) params[key] = value;

  db.prepare(
    `UPDATE people SET ${setClause}, updated_at = datetime('now') WHERE id = @id AND deleted_at IS NULL`
  ).run(params);

  return getPerson(id);
}

export function softDeletePerson(id: number): boolean {
  const result = db
    .prepare(`UPDATE people SET deleted_at = datetime('now') WHERE id = @id AND deleted_at IS NULL`)
    .run({ id });
  return result.changes > 0;
}
