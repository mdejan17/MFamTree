import bcrypt from "bcryptjs";
import { Router } from "express";
import { z } from "zod";
import { requireAuth, signToken } from "../middleware/auth";
import { ApiError } from "../middleware/errorHandler";
import { countUsers, createUser, findUserById, findUserByEmail, toPublicUser } from "../models/users";

export const authRouter = Router();

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  displayName: z.string().min(1).max(100).optional(),
});

// Open signup, but only the very first account in the system is auto-promoted
// to admin; everyone after that starts as a "viewer" until an admin changes
// their role. This is a simple bootstrap default — swap for invite-only
// signup later if you want tighter control over who can join.
authRouter.post("/auth/signup", (req, res) => {
  const body = signupSchema.parse(req.body);

  if (findUserByEmail(body.email)) {
    throw new ApiError(409, "An account with this email already exists");
  }

  const isFirstUser = countUsers() === 0;
  const passwordHash = bcrypt.hashSync(body.password, 10);
  const user = createUser({
    email: body.email,
    passwordHash,
    displayName: body.displayName ?? null,
    role: isFirstUser ? "admin" : "viewer",
  });

  const token = signToken({ sub: user.id, role: user.role });
  res.status(201).json({ token, user: toPublicUser(user) });
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post("/auth/login", (req, res) => {
  const body = loginSchema.parse(req.body);
  const user = findUserByEmail(body.email);
  if (!user || !bcrypt.compareSync(body.password, user.password_hash)) {
    throw new ApiError(401, "Invalid email or password");
  }
  const token = signToken({ sub: user.id, role: user.role });
  res.json({ token, user: toPublicUser(user) });
});

authRouter.get("/auth/me", requireAuth, (req, res) => {
  const user = findUserById(req.user!.id);
  if (!user) {
    throw new ApiError(401, "User no longer exists");
  }
  res.json({ user: toPublicUser(user) });
});
