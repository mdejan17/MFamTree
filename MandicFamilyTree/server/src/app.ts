import cors from "cors";
import express from "express";
import { config } from "./config";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { requestLogger } from "./middleware/requestLogger";
import { authRouter } from "./routes/auth";
import { branchesRouter } from "./routes/branches";
import { healthRouter } from "./routes/health";
import { mediaRouter } from "./routes/media";
import { peopleRouter } from "./routes/people";
import { relationshipsRouter } from "./routes/relationships";
import { treeRouter } from "./routes/tree";

export function createApp() {
  const app = express();

  app.use(cors({ origin: config.corsOrigin }));
  app.use(express.json());
  app.use(requestLogger);

  app.use("/uploads", express.static(config.uploadDir));

  app.use("/api", healthRouter);
  app.use("/api", authRouter);
  app.use("/api", peopleRouter);
  app.use("/api", relationshipsRouter);
  app.use("/api", treeRouter);
  app.use("/api", mediaRouter);
  app.use("/api", branchesRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
