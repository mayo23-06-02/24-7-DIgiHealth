import { connectToDatabase } from "../lib/mongodb";
import User from "../lib/models/User";
import { getSupabaseAdmin, isSupabaseConfigured } from "../lib/supabase/server";

const EMAILS = ["makabmahlalela@gmail.com", "mayo@razonetix.com"];
const CONFIRM = process.argv.includes("--confirm");

async function main() {
  await connectToDatabase();

  for (const email of EMAILS) {
    const lower = email.toLowerCase();
    const user = await User.findOne({ email: lower }).lean();

    if (!user) {
      console.log(`NOT FOUND (Mongo): ${email}`);
      continue;
    }

    console.log(`FOUND: ${email}`);
    console.log(`  role: ${(user as any).role}, status: ${(user as any).status}`);
    console.log(`  supabaseUid: ${(user as any).supabaseUid || "(none — not linked)"}`);

    if (!CONFIRM) {
      console.log("  [dry run] would delete Mongo user doc" + ((user as any).supabaseUid ? " + Supabase auth user" : ""));
      continue;
    }

    const { deletedCount } = await User.deleteOne({ email: lower });
    console.log(`  deleted Mongo user doc: ${deletedCount === 1}`);

    if ((user as any).supabaseUid) {
      if (!isSupabaseConfigured()) {
        console.log("  Supabase admin not configured — skipped auth deletion");
      } else {
        const admin = getSupabaseAdmin();
        const { error } = await admin.auth.admin.deleteUser((user as any).supabaseUid);
        console.log(error ? `  Supabase auth deletion FAILED: ${error.message}` : "  deleted Supabase auth user: true");
      }
    }
  }

  console.log(CONFIRM ? "\nDone." : "\nDry run only — re-run with --confirm to actually delete.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
