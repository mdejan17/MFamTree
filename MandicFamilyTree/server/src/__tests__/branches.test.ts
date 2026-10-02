import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// See tree.test.ts for why these are require()'d instead of imported.
const tmpDbPath = path.join(
  os.tmpdir(),
  `family-tree-test-branches-${Date.now()}-${Math.random().toString(36).slice(2)}.sqlite3`
);
process.env.DB_PATH = tmpDbPath;
process.env.JWT_SECRET = 'test-secret';
process.env.CORS_ORIGIN = 'http://localhost:8888';

/* eslint-disable @typescript-eslint/no-require-imports */
const { db } = require('../db/connection') as typeof import('../db/connection');
const { runMigrations } = require('../db/schema') as typeof import('../db/schema');
const { createPerson, listPeople, getPerson } = require('../models/people') as typeof import('../models/people');
const {
  createBranch,
  deleteBranch,
  getBranch,
  listBranches,
  purgeBranch,
  renameBranch,
  setBranchPhoto,
  setBranchRoot,
} = require('../models/branches') as typeof import('../models/branches');
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

test('createBranch starts empty with no root person', () => {
  const branch = createBranch('Test Branch A');
  assert.equal(branch.name, 'Test Branch A');
  assert.equal(branch.rootPersonId, null);
  assert.equal(branch.peopleCount, 0);
});

test('the first person added to a branch automatically becomes its root', () => {
  const branch = createBranch('Root Assignment');
  const first = createPerson({ firstName: 'First', branchId: branch.id });
  const second = createPerson({ firstName: 'Second', branchId: branch.id });

  const reloaded = getBranch(branch.id);
  assert.ok(reloaded);
  assert.equal(reloaded!.rootPersonId, first.uid);
  assert.notEqual(reloaded!.rootPersonId, second.uid);
  assert.equal(reloaded!.peopleCount, 2);
});

test('listPeople filters by branchId, and omitting it returns everyone', () => {
  const branchX = createBranch('Branch X');
  const branchY = createBranch('Branch Y');
  const inX = createPerson({ firstName: 'InX', branchId: branchX.id });
  const inY = createPerson({ firstName: 'InY', branchId: branchY.id });

  const xOnly = listPeople(branchX.id);
  assert.ok(xOnly.some((p) => p.uid === inX.uid));
  assert.ok(!xOnly.some((p) => p.uid === inY.uid));

  const everyone = listPeople();
  assert.ok(everyone.some((p) => p.uid === inX.uid));
  assert.ok(everyone.some((p) => p.uid === inY.uid));
});

test('deleting a branch unassigns its people instead of deleting them', () => {
  const branch = createBranch('To Delete');
  const person = createPerson({ firstName: 'Survivor', branchId: branch.id });

  const unassignedCount = deleteBranch(branch.id);
  assert.equal(unassignedCount, 1);
  assert.equal(getBranch(branch.id), undefined);

  // The person is untouched, just no longer attached to any branch.
  const stillThere = getPerson(person.uid);
  assert.ok(stillThere);
  assert.equal(stillThere!.branchId, undefined);
});

test('purging a branch soft-deletes its people instead of just unassigning them', () => {
  const branch = createBranch('To Purge');
  const personA = createPerson({ firstName: 'Gone', branchId: branch.id });
  const personB = createPerson({ firstName: 'AlsoGone', branchId: branch.id });

  const deletedCount = purgeBranch(branch.id);
  assert.equal(deletedCount, 2);
  assert.equal(getBranch(branch.id), undefined);

  // Unlike deleteBranch, the people themselves are gone (soft-deleted) —
  // same mechanism as deleting a person one at a time.
  assert.equal(getPerson(personA.uid), undefined);
  assert.equal(getPerson(personB.uid), undefined);
});

test('purgeBranch never touches people outside the branch being purged', () => {
  const branchA = createBranch('Purge Me');
  const branchB = createBranch('Leave Me Alone');
  createPerson({ firstName: 'Casualty', branchId: branchA.id });
  const safe = createPerson({ firstName: 'Bystander', branchId: branchB.id });

  purgeBranch(branchA.id);

  const stillThere = getPerson(safe.uid);
  assert.ok(stillThere);
  assert.equal(stillThere!.branchId, branchB.id);
});

test('setBranchRoot overwrites an already-set root ("Add Parent" re-rooting)', () => {
  const branch = createBranch('Grows Upward');
  const original = createPerson({ firstName: 'Child', branchId: branch.id });
  const grandparent = createPerson({ firstName: 'Grandparent', branchId: branch.id });

  const reloaded = getBranch(branch.id);
  assert.equal(reloaded!.rootPersonId, original.uid);

  const updated = setBranchRoot(branch.id, grandparent.uid);
  assert.ok(updated);
  assert.equal(updated!.rootPersonId, grandparent.uid);
});

test('listBranches reports a live people count per branch', () => {
  const branch = createBranch('Counted');
  createPerson({ firstName: 'One', branchId: branch.id });
  createPerson({ firstName: 'Two', branchId: branch.id });

  const found = listBranches().find((b) => b.id === branch.id);
  assert.ok(found);
  assert.equal(found!.peopleCount, 2);
});

test('renameBranch updates the name and leaves everything else alone', () => {
  const branch = createBranch('Old Name');
  const renamed = renameBranch(branch.id, 'New Name');
  assert.ok(renamed);
  assert.equal(renamed!.name, 'New Name');
  assert.equal(renamed!.id, branch.id);
});

test('setBranchPhoto sets photoUrl, undefined until then', () => {
  const branch = createBranch('Needs A Photo');
  assert.equal(branch.photoUrl, undefined);

  const updated = setBranchPhoto(branch.id, '/uploads/branch-photo.jpg');
  assert.ok(updated);
  assert.equal(updated!.photoUrl, '/uploads/branch-photo.jpg');
});
