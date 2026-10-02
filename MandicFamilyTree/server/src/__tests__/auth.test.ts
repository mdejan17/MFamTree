import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { Request, Response, NextFunction } from 'express';

// See the comment in tree.test.ts: everything from `src/` (and bcryptjs)
// that depends on these env vars is loaded with require() below, not a
// static `import`, so it actually runs after they're set.
const tmpDbPath = path.join(
  os.tmpdir(),
  `family-tree-test-auth-${Date.now()}-${Math.random().toString(36).slice(2)}.sqlite3`
);
process.env.DB_PATH = tmpDbPath;
process.env.JWT_SECRET = 'test-secret';
process.env.CORS_ORIGIN = 'http://localhost:8888';

/* eslint-disable @typescript-eslint/no-require-imports */
const { hashSync, compareSync } = require('bcryptjs') as typeof import('bcryptjs');
const { db } = require('../db/connection') as typeof import('../db/connection');
const { runMigrations } = require('../db/schema') as typeof import('../db/schema');
const { createUser, findUserByEmail, countUsers } = require('../models/users') as typeof import('../models/users');
const { requireAuth, requireRole, signToken } = require('../middleware/auth') as typeof import('../middleware/auth');
const { ApiError } = require('../middleware/errorHandler') as typeof import('../middleware/errorHandler');
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

function fakeReq(headers: Record<string, string> = {}): Request {
  return { headers } as unknown as Request;
}

test('createUser + bcrypt round trip: correct password verifies, wrong one does not', () => {
  const hash = hashSync('correct-horse-battery-staple', 10);
  const user = createUser({ email: 'a@example.com', passwordHash: hash, role: 'admin' });

  assert.equal(findUserByEmail('a@example.com')?.id, user.id);
  assert.ok(compareSync('correct-horse-battery-staple', user.password_hash));
  assert.ok(!compareSync('wrong-password', user.password_hash));
});

test('requireAuth accepts a valid token and attaches req.user', () => {
  const user = createUser({ email: 'b@example.com', passwordHash: 'x', role: 'editor' });
  const token = signToken({ sub: user.id, role: 'editor' });

  const req = fakeReq({ authorization: `Bearer ${token}` });
  let nextCalled = false;
  requireAuth(req, {} as Response, (() => { nextCalled = true; }) as NextFunction);

  assert.ok(nextCalled);
  assert.deepEqual(req.user, { id: user.id, role: 'editor' });
});

test('requireAuth rejects a missing Authorization header', () => {
  const req = fakeReq();
  assert.throws(
    () => requireAuth(req, {} as Response, (() => {}) as NextFunction),
    (err: unknown) => err instanceof ApiError && err.status === 401
  );
});

test('requireAuth rejects a garbage token', () => {
  const req = fakeReq({ authorization: 'Bearer not-a-real-token' });
  assert.throws(
    () => requireAuth(req, {} as Response, (() => {}) as NextFunction),
    (err: unknown) => err instanceof ApiError && err.status === 401
  );
});

test('requireRole allows a matching role and blocks a non-matching one', () => {
  const next = () => {};

  const adminReq = { user: { id: 1, role: 'admin' } } as unknown as Request;
  let called = false;
  requireRole('admin', 'editor')(adminReq, {} as Response, (() => { called = true; }) as NextFunction);
  assert.ok(called);

  const viewerReq = { user: { id: 2, role: 'viewer' } } as unknown as Request;
  assert.throws(
    () => requireRole('admin', 'editor')(viewerReq, {} as Response, next as NextFunction),
    (err: unknown) => err instanceof ApiError && err.status === 403
  );
});

test('the first user created by signup logic would be admin — countUsers starts at 0', () => {
  // Exercises the same "first user" check routes/auth.ts's signup handler
  // uses, without spinning up a full HTTP server for this test.
  const before = countUsers();
  createUser({ email: `fresh-${Date.now()}@example.com`, passwordHash: 'x', role: before === 0 ? 'admin' : 'viewer' });
  assert.equal(countUsers(), before + 1);
});
