import "dotenv/config";
import path from "node:path";

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  dbPath: path.resolve(process.cwd(), required("DB_PATH", "./data/family-tree.sqlite3")),
  corsOrigin: required("CORS_ORIGIN", "http://localhost:8888"),
  nodeEnv: process.env.NODE_ENV ?? "development",
  jwtSecret: required(
    "JWT_SECRET",
    process.env.NODE_ENV === "production" ? undefined : "dev-only-insecure-secret"
  ),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  uploadDir: path.resolve(process.cwd(), required("UPLOAD_DIR", "./data/uploads")),
  maxUploadBytes: Number(process.env.MAX_UPLOAD_BYTES ?? 10 * 1024 * 1024), // 10MB
};
