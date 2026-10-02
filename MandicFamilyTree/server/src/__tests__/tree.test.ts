import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// IMPORTANT: static `import` declarations are hoisted above all other
// top-level code (even the process.env assignments below, regardless of
// source order). This file is built/run as CommonJS, so we use plain
// require() instead for anything from `src/` whose behavior depends on
// these env vars — config.ts reads them once, at import time, and
// require() (unlike `import`) runs exactly where it's written.
const tmpDbPath = path.join(
  os.tmpdir(),
  `family-tree-test-tree-${Date.now()}-${Math.random().toString(36).slice(2)}.sqlite3`
);
process.env.DB_PATH = tmpDbPath;
process.env.JWT_SECRET = 'test-secret';
process.env.CORS_ORIGIN = 'http://localhost:8888';

/* eslint-disable @typescript-eslint/no-require-imports */
const { db } = require('../db/connection') as typeof import('../db/connection');
const { runMigrations } = require('../db/schema') as typeof import('../db/schema');
const { createPerson } = require('../models/people') as typeof import('../models/people');
const { createRelationship } = require('../models/relationships') as typeof import('../models/relationships');
const { buildTree } = require('../models/tree') as typeof import('../models/tree');
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

test('buildTree walks parent_of relationships recursively', () => {
  const grandparent = createPerson({ firstName: 'Grandparent' });
  const parent = createPerson({ firstName: 'Parent' });
  const child = createPerson({ firstName: 'Child' });

  createRelationship({ personAId: grandparent.uid, personBId: parent.uid, type: 'parent_of' });
  createRelationship({ personAId: parent.uid, personBId: child.uid, type: 'parent_of' });

  const tree = buildTree(grandparent.uid);
  assert.ok(tree);
  assert.equal(tree!.name, 'Grandparent');
  assert.equal(tree!.children?.length, 1);
  assert.equal(tree!.children![0].name, 'Parent');
  assert.equal(tree!.children![0].children?.length, 1);
  assert.equal(tree!.children![0].children![0].name, 'Child');
});

test('buildTree returns undefined for an unknown id', () => {
  const tree = buildTree(999999);
  assert.equal(tree, undefined);
});

test('a person with no children is a leaf (no `children` key)', () => {
  const loner = createPerson({ firstName: 'Loner' });
  const tree = buildTree(loner.uid);
  assert.ok(tree);
  assert.equal(tree!.children, undefined);
});

test('buildTree guards against cycles instead of looping forever', () => {
  const a = createPerson({ firstName: 'CycleA' });
  const b = createPerson({ firstName: 'CycleB' });
  // A data-integrity-violating cycle (shouldn't normally happen, but the
  // walk must not hang or stack-overflow if it ever does).
  createRelationship({ personAId: a.uid, personBId: b.uid, type: 'parent_of' });
  createRelationship({ personAId: b.uid, personBId: a.uid, type: 'parent_of' });

  const tree = buildTree(a.uid);
  assert.ok(tree);
  assert.equal(tree!.name, 'CycleA');
});
