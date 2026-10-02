import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { config } from "../config";
import { requireAuth, requireRole } from "../middleware/auth";
import { ApiError } from "../middleware/errorHandler";
import { createMedia, listMediaForPerson } from "../models/media";
import { getPerson, updatePerson } from "../models/people";

export const mediaRouter = Router();

fs.mkdirSync(config.uploadDir, { recursive: true });

const ALLOWED_MIME_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "application/pdf": ".pdf",
};

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

const personIdParam = z.object({ id: z.coerce.number().int().positive() });
const mediaBodySchema = z.object({
  kind: z.enum(["photo", "document"]).default("photo"),
  caption: z.string().optional(),
});

mediaRouter.post(
  "/people/:id/media",
  requireAuth,
  requireRole("admin", "editor"),
  upload.single("file"),
  (req, res) => {
    const { id } = personIdParam.parse(req.params);
    const body = mediaBodySchema.parse(req.body);

    const person = getPerson(id);
    if (!person) throw new ApiError(404, "Person not found");
    if (!req.file) throw new ApiError(400, "No file was uploaded (expected field \"file\")");

    const fileUrl = `/uploads/${req.file.filename}`;

    const media = createMedia({
      personId: id,
      fileUrl,
      kind: body.kind,
      caption: body.caption,
      uploadedBy: req.user!.id,
    });

    // Only auto-adopt a freshly-uploaded photo as the profile picture when
    // the person doesn't have one yet (a brand-new profile). Once a profile
    // picture exists, later uploads just add to the gallery — otherwise
    // every photo added to someone's gallery (old family photos, scanned
    // documents-as-images, etc.) would silently replace their profile
    // picture with whatever was uploaded most recently. Explicitly picking
    // a profile picture is a separate action (PATCH /people/:id).
    if (body.kind === "photo" && !person.profilePic) {
      updatePerson(id, { profilePic: fileUrl });
    }

    res.status(201).json(media);
  }
);

mediaRouter.get("/people/:id/media", (req, res) => {
  const { id } = personIdParam.parse(req.params);
  if (!getPerson(id)) throw new ApiError(404, "Person not found");
  res.json(listMediaForPerson(id));
});
