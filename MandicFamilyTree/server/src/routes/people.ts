import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth";
import { ApiError } from "../middleware/errorHandler";
import { createPerson, getPerson, listPeople, softDeletePerson, updatePerson } from "../models/people";

export const peopleRouter = Router();

const personIdParam = z.object({ id: z.coerce.number().int().positive() });

const personBodySchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().optional(),
  maidenName: z.string().optional(),
  gender: z.string().optional(),
  dateOfBirth: z.string().optional(),
  dateOfDeath: z.string().optional(),
  residency: z.string().optional(),
  note: z.string().optional(),
  profilePic: z.string().optional(),
  branchId: z.coerce.number().int().positive().optional(),
});

// branchId is deliberately excluded here — reassigning an existing person
// to a different branch isn't a supported operation (branches only gain
// people via creation, see createPerson), so PATCH never touches it.
const personUpdateSchema = personBodySchema.omit({ branchId: true }).partial();

const peopleQuerySchema = z.object({ branchId: z.coerce.number().int().positive().optional() });

peopleRouter.get("/people", (req, res) => {
  const { branchId } = peopleQuerySchema.parse(req.query);
  res.json(listPeople(branchId));
});

peopleRouter.get("/people/:id", (req, res) => {
  const { id } = personIdParam.parse(req.params);
  const person = getPerson(id);
  if (!person) throw new ApiError(404, "Person not found");
  res.json(person);
});

peopleRouter.post("/people", requireAuth, requireRole("admin", "editor"), (req, res) => {
  const body = personBodySchema.parse(req.body);
  const person = createPerson({ ...body, createdBy: req.user!.id });
  res.status(201).json(person);
});

peopleRouter.patch("/people/:id", requireAuth, requireRole("admin", "editor"), (req, res) => {
  const { id } = personIdParam.parse(req.params);
  const body = personUpdateSchema.parse(req.body);
  const existing = getPerson(id);
  if (!existing) throw new ApiError(404, "Person not found");
  const updated = updatePerson(id, body);
  res.json(updated);
});

peopleRouter.delete("/people/:id", requireAuth, requireRole("admin", "editor"), (req, res) => {
  const { id } = personIdParam.parse(req.params);
  const existing = getPerson(id);
  if (!existing) throw new ApiError(404, "Person not found");
  softDeletePerson(id);
  res.status(204).send();
});
