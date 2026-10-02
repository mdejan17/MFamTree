import { db } from "./connection";
import { runMigrations } from "./schema";

runMigrations(db);
console.log("Migrations applied.");
