import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { config } from "../config";
import { requireAuth, requireRole } from "../middleware/auth";
import { ApiError } from "../middleware/errorHandler";
import {
  createBranch,
  deleteBranch,
  getBranch,
  listBranches,
  purgeBranch,
  renameBranch,
  setBranchPhoto,
  setBranchRoot,
} from "../models/branches";
import { getPerson } from "../models/people";

export const branchesRouter = Router();

const branchIdParam = z.object({ id: z.coerce.number().int().positive() });
const branchBodySchema = z.object({ name: z.string().trim().min(1).max(100) });
const branchRootBodySchema = z.object({ rootPersonId: z.coerce.number().int().positive() });

// Open read, like /people — anyone who can see the app can see what
// branches exist and pick one; only creating/deleting/editing one is
// gated below.
branchesRouter.get("/branches", (_req, res) => {
  res.json(listBranches());
});

branchesRouter.post("/branches", requireAuth, requireRole("admin"), (req, res) => {
  const { name } = branchBodySchema.parse(req.body);
  res.status(201).json(createBranch(name));
});

branchesRouter.patch("/branches/:id", requireAuth, requireRole("admin"), (req, res) => {
  const { id } = branchIdParam.parse(req.params);
  const { name } = branchBodySchema.parse(req.body);
  const existing = getBranch(id);
  if (!existing) throw new ApiError(404, "Branch not found");
  res.json(renameBranch(id, name));
});

// Re-roots the branch onto a different (existing) person — used by "Add
// Parent" in the tree view, which creates a new person above the current
// root and then has to move the tree's single entry point up onto them.
// Gated like person creation (admin/editor), not admin-only like
// rename/delete — this is a normal tree-editing action, not branch
// management.
branchesRouter.patch("/branches/:id/root", requireAuth, requireRole("admin", "editor"), (req, res) => {
  const { id } = branchIdParam.parse(req.params);
  const { rootPersonId } = branchRootBodySchema.parse(req.body);
  const existing = getBranch(id);
  if (!existing) throw new ApiError(404, "Branch not found");
  const person = getPerson(rootPersonId);
  if (!person) throw new ApiError(404, "Person not found");
  if (person.branchId !== id) throw new ApiError(400, "That person is not in this branch");
  res.json(setBranchRoot(id, rootPersonId));
});

// Unassigns (never deletes) every person in the branch — see
// models/branches.ts#deleteBranch — and reports how many that was, so the
// confirm dialog on the frontend can show a real count before committing.
branchesRouter.delete("/branches/:id", requireAuth, requireRole("admin"), (req, res) => {
  const { id } = branchIdParam.parse(req.params);
  const existing = getBranch(id);
  if (!existing) throw new ApiError(404, "Branch not found");
  const unassignedCount = deleteBranch(id);
  res.json({ unassignedCount });
});

// The irreversible sibling of the route above: soft-deletes every person in
// the branch (same mechanism as DELETE /people/:id) instead of unassigning
// them, in addition to removing the branch row.
branchesRouter.delete("/branches/:id/purge", requireAuth, requireRole("admin"), (req, res) => {
  const { id } = branchIdParam.parse(req.params);
  const existing = getBranch(id);
  if (!existing) throw new ApiError(404, "Branch not found");
  const deletedCount = purgeBranch(id);
  res.json({ deletedCount });
});

// Same upload setup as routes/media.ts, restricted to images only — a
// branch gets a single cover photo, not a gallery, so this doesn't go
// through the media table at all.
const ALLOWED_MIME_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

fs.mkdirSync(config.uploadDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: config.uploadDir,
    filename: (_req, file, cb) => {
      const ext = ALLOWED_MIME_TYPES[file.mimetype] ?? path.extname(file.originalname);
      cb(null, `${crypto.randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: config.maxUploadBytes },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES[file.mimetype]) {
      cb(new ApiError(400, `Unsupported file type: ${file.mimetype}`));
      return;
    }
    cb(null, true);
  },
});

branchesRouter.post(
  "/branches/:id/photo",
  requireAuth,
  requireRole("admin"),
  upload.single("file"),
  (req, res) => {
    const { id } = branchIdParam.parse(req.params);
    const existing = getBranch(id);
    if (!existing) throw new ApiError(404, "Branch not found");
    if (!req.file) throw new ApiError(400, 'No file was uploaded (expected field "file")');

    const photoUrl = `/uploads/${req.file.filename}`;
    res.json(setBranchPhoto(id, photoUrl));
  }
);
