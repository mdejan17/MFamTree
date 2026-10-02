import { db } from "../db/connection";

export type UserRole = "admin" | "editor" | "viewer";

export interface UserRow {
  id: number;
  email: string;
  password_hash: string;
  display_name: string | null;
  role: UserRole;
  linked_person_id: number | null;
  created_at: string;
}

export function countUsers(): number {
  const row = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
  return row.count;
}

export function findUserByEmail(email: string): UserRow | undefined {
  return db
    .prepare("SELECT * FROM users WHERE email = @email")
    .get({ email }) as UserRow | undefined;
}

export function findUserById(id: number): UserRow | undefined {
  return db.prepare("SELECT * FROM users WHERE id = @id").get({ id }) as UserRow | undefined;
}

export function createUser(params: {
  email: string;
  passwordHash: string;
  displayName?: string | null;
  role: UserRole;
}): UserRow {
  const result = db
    .prepare(
      `INSERT INTO users (email, password_hash, display_name, role)
       VALUES (@email, @passwordHash, @displayName, @role)`
    )
    .run({
      email: params.email,
      passwordHash: params.passwordHash,
      displayName: params.displayName ?? null,
      role: params.role,
    });

  return findUserById(Number(result.lastInsertRowid))!;
}

export function toPublicUser(user: UserRow) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.display_name,
    role: user.role,
    linkedPersonId: user.linked_person_id,
    createdAt: user.created_at,
  };
}
