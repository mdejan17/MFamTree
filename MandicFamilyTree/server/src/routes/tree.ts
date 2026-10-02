import { Router } from "express";
import { z } from "zod";
import { ApiError } from "../middleware/errorHandler";
import { buildTree } from "../models/tree";

export const treeRouter = Router();

const rootIdParam = z.object({ rootId: z.coerce.number().int().positive() });

treeRouter.get("/tree/:rootId", (req, res) => {
  const { rootId } = rootIdParam.parse(req.params);
  const tree = buildTree(rootId);
  if (!tree) throw new ApiError(404, "Person not found");
  res.json(tree);
});
