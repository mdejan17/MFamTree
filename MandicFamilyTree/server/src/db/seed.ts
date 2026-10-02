import fs from "node:fs";
import path from "node:path";
import { db, withTransaction } from "./connection";
import { runMigrations } from "./schema";

interface SeedPerson {
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
  spouseUid?: number[];
  offspringUid: number[];
  profilePic?: string;
  libarary?: string[];
}

const SEED_FILE = path.resolve(__dirname, "../../seed-data/people.json");

function loadSeedPeople(): SeedPerson[] {
  if (!fs.existsSync(SEED_FILE)) {
    throw new Error(
      `Seed data not found at ${SEED_FILE}. Run "npm run export-seed-data" first.`
    );
  }
  return JSON.parse(fs.readFileSync(SEED_FILE, "utf8"));
}

function seed(): void {
  runMigrations(db);

  const people = loadSeedPeople();

  const insertPerson = db.prepare(`
    INSERT INTO people (id, first_name, last_name, maiden_name, gender, date_of_birth, date_of_death, residency, note)
    VALUES (@id, @firstName, @lastName, @maidenName, @gender, @dateOfBirth, @dateOfDeath, @residency, @note)
    ON CONFLICT(id) DO UPDATE SET
      first_name = excluded.first_name,
      last_name = excluded.last_name,
      maiden_name = excluded.maiden_name,
      gender = excluded.gender,
      date_of_birth = excluded.date_of_birth,
      date_of_death = excluded.date_of_death,
      residency = excluded.residency,
      note = excluded.note,
      updated_at = datetime('now')
  `);

  const insertRelationship = db.prepare(`
    INSERT OR IGNORE INTO relationships (person_a_id, person_b_id, type)
    VALUES (@a, @b, @type)
  `);

  const knownIds = new Set(people.map((p) => p.uid));
  const spouseDone = new Set<string>();

  withTransaction(() => {
    const rows = people;
    for (const p of rows) {
      insertPerson.run({
        id: p.uid,
        firstName: p.firstName,
        lastName: p.lastName ?? null,
        maidenName: p.maidenName || null,
        gender: p.gender ?? null,
        dateOfBirth: p.dateOfBirth ?? null,
        dateOfDeath: p.dateOfDeath ?? null,
        residency: p.residency || null,
        note: p.note || null,
      });
    }

    let parentOfCount = 0;
    let spouseOfCount = 0;

    for (const p of rows) {
      for (const childId of p.offspringUid ?? []) {
        if (!knownIds.has(childId)) continue;
        insertRelationship.run({ a: p.uid, b: childId, type: "parent_of" });
        parentOfCount++;
      }
      for (const spouseId of p.spouseUid ?? []) {
        if (!knownIds.has(spouseId)) continue;
        const key = [p.uid, spouseId].sort((a, b) => a - b).join("-");
        if (spouseDone.has(key)) continue;
        spouseDone.add(key);
        insertRelationship.run({ a: p.uid, b: spouseId, type: "spouse_of" });
        spouseOfCount++;
      }
    }

    console.log(`Seeded ${rows.length} people.`);
    console.log(`Inserted up to ${parentOfCount} parent_of relationships.`);
    console.log(`Inserted up to ${spouseOfCount} spouse_of relationships.`);
  });

  // The people above were inserted directly (bypassing models/people.ts'
  // createPerson, which is what normally assigns a branch), so they're all
  // still branch_id IS NULL at this point. runMigrations' backfill step
  // sweeps anything unassigned into one catch-all branch and picks its
  // root — safe/idempotent to call again here, same as on every server boot.
  runMigrations(db);
}

seed();
