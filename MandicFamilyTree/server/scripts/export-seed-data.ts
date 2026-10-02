/**
 * One-off helper: reads the frontend's hardcoded mock dataset
 * (src/data/bigDatabase.tsx) and dumps it as plain JSON that
 * server/src/db/seed.ts can load without needing to compile or
 * import frontend TSX from the backend package.
 *
 * Run with: npm run export-seed-data   (from server/)
 */
import fs from "node:fs";
import path from "node:path";
import { DatabaseBigFlat } from "../../src/data/bigDatabase";

const outDir = path.resolve(__dirname, "../seed-data");
fs.mkdirSync(outDir, { recursive: true });

const outFile = path.join(outDir, "people.json");
fs.writeFileSync(outFile, JSON.stringify(DatabaseBigFlat, null, 2));

console.log(`Wrote ${DatabaseBigFlat.length} people to ${outFile}`);
