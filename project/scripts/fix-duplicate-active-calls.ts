/**
 * Manual runner for the duplicate-active-call cleanup.
 *
 * You should not normally need this. The same migration runs by itself on the
 * first database connection after a deploy (see lib/migrations), guarded by a
 * record in the Migration collection so it happens exactly once. This exists
 * for the cases that guard cannot serve: previewing what would change before
 * shipping, and re-running by hand if a migration was marked failed.
 *
 *   npm run fix:duplicate-calls -- --dry-run
 *   npm run fix:duplicate-calls
 */
import * as dotenv from "dotenv";
import path from "path";
import mongoose from "mongoose";
import { collapseDuplicateActiveCalls } from "../lib/migrations/collapseDuplicateActiveCalls";

// Same convention as the other scripts in here: read .env.local explicitly
// rather than whatever happens to be in the ambient environment.
dotenv.config({ path: path.join(__dirname, "../.env.local") });

const DRY_RUN = process.argv.includes("--dry-run");

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "MONGODB_URI is not set. Add it to .env.local, or run against the " +
        "environment that holds the data you mean to clean up.",
    );
  }
  if (!/^mongodb(\+srv)?:\/\//.test(uri)) {
    throw new Error(
      `MONGODB_URI does not look like a connection string (got "${uri.slice(0, 24)}…"). ` +
        "A placeholder value here would silently point the cleanup at the wrong place, " +
        "so this stops rather than guessing.",
    );
  }

  await mongoose.connect(uri);
  console.log(
    DRY_RUN ? "Dry run — nothing will be written.\n" : "Applying changes.\n",
  );

  const report = await collapseDuplicateActiveCalls({
    dryRun: DRY_RUN,
    log: (line) => console.log(line),
  });

  console.log(
    `\nconversations with duplicates: ${report.conversationGroups}` +
      `\nconsultations with duplicates: ${report.consultationGroups}` +
      `\nrows ended: ${report.rowsEnded}` +
      `\nindexes built: ${report.indexesBuilt ? "yes" : "no (dry run)"}`,
  );

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err instanceof Error ? err.message : err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
