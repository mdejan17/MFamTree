import { createApp } from "./app";
import { config } from "./config";
import { db } from "./db/connection";
import { runMigrations } from "./db/schema";

runMigrations(db);

const app = createApp();

app.listen(config.port, () => {
  console.log(`Family tree API listening on http://localhost:${config.port}`);
});
