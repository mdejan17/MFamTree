import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth";
import { ApiError } from "../middleware/errorHandler";
import {
  createRelationship,
  deleteRelationship,
  findRelationship,
  findRelationshipByPair,
  personExists,
} from "../models/relationships";

export const relationshipsRouter = Router();

const relationshipBodySchema = z.object({
  personAId: z.coerce.number().int().positive(),
  personBId: z.coerce.number().int().positive(),
  type: z.enum(["parent_of", "spouse_of"]),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

const relationshipIdParam = z.object({ id: z.coerce.number().int().positive() });

// Query-string version of the relationship body, used by the "unlink" DELETE
// route below — the frontend knows the two people and the relationship
// type, not the relationship row's own id.
const relationshipPairQuery = z.object({
  personAId: z.coerce.number().int().positive(),
  personBId: z.coerce.number().int().positive(),
  type: z.enum(["parent_of", "spouse_of"]),
});

relationshipsRouter.post(
  "/relationships",
  requireAuth,
  requireRole("admin", "editor"),
  (req, res) => {
    const body = relationshipBodySchema.parse(req.body);
    if (body.personAId === body.personBId) {
      throw new ApiError(400, "A person cannot have a relationship with themself");
    }
    if (!personExists(body.personAId) || !personExists(body.personBId)) {
      throw new ApiError(404, "One or both people were not found");
    }
    const relationship = createRelationship(body);
    res.status(201).json(relationship);
  }
);

relationshipsRouter.delete(
  "/relationships/:id",
  requireAuth,
  requireRole("admin", "editor"),
  (req, res) => {
    const { id } = relationshipIdParam.parse(req.params);
    if (!findRelationship(id)) throw new ApiError(404, "Relationship not found");
    deleteRelationship(id);
    res.status(204).send();
  }
);

relationshipsRouter.delete(
  "/relationships",
  requireAuth,
  requireRole("admin", "editor"),
  (req, res) => {
    const query = relationshipPairQuery.parse(req.query);
    const relationship = findRelationshipByPair(query.personAId, query.personBId, query.type);
    if (!relationship) throw new ApiError(404, "Relationship not found");
    deleteRelationship(relationship.id);
    res.status(204).send();
  }
);
