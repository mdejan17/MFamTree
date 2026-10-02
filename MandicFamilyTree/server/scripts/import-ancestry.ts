/**
 * One-off import: replaces whatever is currently in the `people` /
 * `relationships` / `media` tables with the real ancestry data parsed out of
 * "LOZA FAMILIJE SA MAMINE STRANE1.xls" (see scripts/ancestry-import/people.json
 * for the parsed data, and review.txt for a human-readable listing of every
 * person it contains, grouped by source sheet + generation).
 *
 * Run with: npx tsx scripts/import-ancestry.ts
 *
 * Does NOT touch the `users` table (login accounts) — only genealogy data.
 */
import fs from "node:fs";
import path from "node:path";
import { db, withTransaction } from "../src/db/connection";
import { runMigrations } from "../src/db/schema";

interface ParsedPerson {
  id: number;
  firstName: string;
  lastName?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  dateOfDeath?: string | null;
  note?: string | null;
}

interface ParsedData {
  people: ParsedPerson[];
  spouse: [number, number][];
  parent: [number, number][];
}

function loadData(): ParsedData {
  const file = path.resolve(__dirname, "ancestry-import/people.json");
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function main() {
  runMigrations(db);
  const data = loadData();

  withTransaction(() => {
    // Clear out anything that references people before clearing people itself.
    db.prepare("DELETE FROM media").run();
    db.prepare("DELETE FROM relationships").run();
    db.prepare("UPDATE users SET linked_person_id = NULL WHERE linked_person_id IS NOT NULL").run();
    db.prepare("DELETE FROM people").run();

    const insertPerson = db.prepare(`
      INSERT INTO people (id, first_name, last_name, gender, date_of_birth, date_of_death, note)
      VALUES (@id, @firstName, @lastName, @gender, @dateOfBirth, @dateOfDeath, @note)
    `);
    for (const p of data.people) {
      insertPerson.run({
        id: p.id,
        firstName: p.firstName,
        lastName: p.lastName ?? null,
        gender: p.gender ?? null,
        dateOfBirth: p.dateOfBirth ?? null,
        dateOfDeath: p.dateOfDeath ?? null,
        note: p.note ?? null,
      });
    }

    const insertRel = db.prepare(`
      INSERT OR IGNORE INTO relationships (person_a_id, person_b_id, type)
      VALUES (@a, @b, @type)
    `);
    for (const [a, b] of data.spouse) {
      insertRel.run({ a, b, type: "spouse_of" });
    }
    for (const [parent, child] of data.parent) {
      insertRel.run({ a: parent, b: child, type: "parent_of" });
    }

    console.log(`Inserted ${data.people.length} people.`);
    console.log(`Inserted up to ${data.spouse.length} spouse_of relationships.`);
    console.log(`Inserted up to ${data.parent.length} parent_of relationships.`);
  });
}

main();
