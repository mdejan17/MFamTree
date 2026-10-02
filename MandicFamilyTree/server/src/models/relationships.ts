import { db } from "../db/connection";

export type RelationshipType = "parent_of" | "spouse_of";

export interface RelationshipRow {
  id: number;
  person_a_id: number;
  person_b_id: number;
  type: RelationshipType;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

export interface CreateRelationshipInput {
  personAId: number;
  personBId: number;
  type: RelationshipType;
  startDate?: string;
  endDate?: string;
}

export function createRelationship(input: CreateRelationshipInput): RelationshipRow {
  const result = db
    .prepare(
      `INSERT OR IGNORE INTO relationships (person_a_id, person_b_id, type, start_date, end_date)
       VALUES (@personAId, @personBId, @type, @startDate, @endDate)`
    )
    .run({
      personAId: input.personAId,
      personBId: input.personBId,
      type: input.type,
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
    });

  const id =
    result.changes > 0
      ? Number(result.lastInsertRowid)
      : (
          db
            .prepare(
              `SELECT id FROM relationships WHERE person_a_id = @personAId AND person_b_id = @personBId AND type = @type`
            )
            .get({
              personAId: input.personAId,
              personBId: input.personBId,
              type: input.type,
            }) as { id: number }
        ).id;

  return db.prepare(`SELECT * FROM relationships WHERE id = @id`).get({ id }) as unknown as RelationshipRow;
}

export function deleteRelationship(id: number): boolean {
  const result = db.prepare(`DELETE FROM relationships WHERE id = @id`).run({ id });
  return result.changes > 0;
}

export function findRelationship(id: number): RelationshipRow | undefined {
  return db.prepare(`SELECT * FROM relationships WHERE id = @id`).get({ id }) as unknown as
    | RelationshipRow
    | undefined;
}

// Looks a relationship up by the two people it connects instead of its raw
// id — the frontend only ever knows "this person" + "that linked person",
// never the relationship row's own id, so this is what the unlink UI uses.
// spouse_of has no inherent direction, so both orderings are checked;
// parent_of is directional (personA is the parent), so only the exact
// ordering counts.
export function findRelationshipByPair(
  personAId: number,
  personBId: number,
  type: RelationshipType
): RelationshipRow | undefined {
  if (type === "spouse_of") {
    return db
      .prepare(
        `SELECT * FROM relationships
         WHERE type = 'spouse_of'
           AND ((person_a_id = @a AND person_b_id = @b) OR (person_a_id = @b AND person_b_id = @a))`
      )
      .get({ a: personAId, b: personBId }) as unknown as RelationshipRow | undefined;
  }
  return db
    .prepare(
      `SELECT * FROM relationships WHERE type = @type AND person_a_id = @personAId AND person_b_id = @personBId`
    )
    .get({ personAId, personBId, type }) as unknown as RelationshipRow | undefined;
}

export function personExists(id: number): boolean {
  const row = db
    .prepare(`SELECT 1 FROM people WHERE id = @id AND deleted_at IS NULL`)
    .get({ id });
  return row !== undefined;
}
