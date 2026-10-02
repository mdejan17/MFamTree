import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// See tree.test.ts for why these are require()'d instead of imported.
const tmpDbPath = path.join(
  os.tmpdir(),
  `family-tree-test-relationships-${Date.now()}-${Math.random().toString(36).slice(2)}.sqlite3`
);
process.env.DB_PATH = tmpDbPath;
process.env.JWT_SECRET = 'test-secret';
process.env.CORS_ORIGIN = 'http://localhost:8888';

/* eslint-disable @typescript-eslint/no-require-imports */
const { db } = require('../db/connection') as typeof import('../db/connection');
const { runMigrations } = require('../db/schema') as typeof import('../db/schema');
const { createPerson } = require('../models/people') as typeof import('../models/people');
const {
  createRelationship,
  findRelationshipByPair,
  deleteRelationship,
} = require('../models/relationships') as typeof import('../models/relationships');
/* eslint-enable @typescript-eslint/no-require-imports */

before(() => {
  runMigrations(db);
});

after(() => {
  db.close();
  for (const suffix of ['', '-wal', '-shm']) {
    fs.rmSync(tmpDbPath + suffix, { force: true });
  }
});

test('findRelationshipByPair finds a parent_of link in its stored direction only', () => {
  const parent = createPerson({ firstName: 'Parent' });
  const child = createPerson({ firstName: 'Child' });
  createRelationship({ personAId: parent.uid, personBId: child.uid, type: 'parent_of' });

  const forward = findRelationshipByPair(parent.uid, child.uid, 'parent_of');
  assert.ok(forward);

  const backwards = findRelationshipByPair(child.uid, parent.uid, 'parent_of');
  assert.equal(backwards, undefined);
});

test('findRelationshipByPair finds a spouse_of link regardless of order', () => {
  const a = createPerson({ firstName: 'SpouseA' });
  const b = createPerson({ firstName: 'SpouseB' });
  createRelationship({ personAId: a.uid, personBId: b.uid, type: 'spouse_of' });

  assert.ok(findRelationshipByPair(a.uid, b.uid, 'spouse_of'));
  assert.ok(findRelationshipByPair(b.uid, a.uid, 'spouse_of'));
});

test('a relationship found by pair can be deleted by its resolved id', () => {
  const a = createPerson({ firstName: 'ToUnlinkA' });
  const b = createPerson({ firstName: 'ToUnlinkB' });
  createRelationship({ personAId: a.uid, personBId: b.uid, type: 'spouse_of' });

  const found = findRelationshipByPair(a.uid, b.uid, 'spouse_of');
  assert.ok(found);
  assert.equal(deleteRelationship(found!.id), true);
  assert.equal(findRelationshipByPair(a.uid, b.uid, 'spouse_of'), undefined);
});

test('findRelationshipByPair returns undefined for people with no relationship', () => {
  const a = createPerson({ firstName: 'Unrelated1' });
  const b = createPerson({ firstName: 'Unrelated2' });
  assert.equal(findRelationshipByPair(a.uid, b.uid, 'spouse_of'), undefined);
  assert.equal(findRelationshipByPair(a.uid, b.uid, 'parent_of'), undefined);
});
