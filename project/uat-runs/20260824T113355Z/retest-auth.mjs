import { Recorder, makeSession, json } from "./recorder.mjs";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

/**
 * Re-run of B-01/B-02 only.
 *
 * The main run recorded these against a login budget its own earlier passes
 * had already spent, so both came back 429 — a harness artifact, not a product
 * result. This runs them in isolation on a fresh window and rewrites those two
 * entries in the session record.
 */
const DIR = path.dirname(fileURLToPath(import.meta.url));
const BASE = "https://24-7-d-igi-health.vercel.app";
const rec = new Recorder(path.join(DIR, "retest"), BASE);

const s = makeSession(BASE, "auth-retest");
const { res: bad, bodyText: badBody } = await rec.call(s, "POST", "/api/auth/login",
  json({ identifier: "thandiwe.mokoena@example.com", password: "WrongPassword!" }));
const { res: unk, bodyText: unkBody } = await rec.call(s, "POST", "/api/auth/login",
  json({ identifier: "definitely-not-a-user@example.com", password: "WrongPassword!" }));

rec.check("B-01", "Auth", "Wrong password rejected", bad?.status === 401, "HTTP " + bad?.status);
rec.check("B-02", "Auth", "No account enumeration",
  bad?.status === unk?.status && badBody === unkBody,
  "wrong-pw " + bad?.status + " vs unknown " + unk?.status +
    (badBody === unkBody ? ", identical bodies" : ", DIFFERENT bodies"));

const summary = rec.finish({ environment: BASE, note: "isolated re-run of B-01/B-02" });

// Merge the corrected results back into the main record.
const mainPath = path.join(DIR, "summary.json");
const main = JSON.parse(fs.readFileSync(mainPath, "utf8"));
for (const fixed of summary.steps) {
  const i = main.steps.findIndex((x) => x.id === fixed.id);
  if (i >= 0) main.steps[i] = { ...fixed, note: "re-run in isolation; original attempt hit the suite's own login budget" };
}
main.counts = main.steps.reduce((a, x) => ((a[x.status] = (a[x.status] || 0) + 1), a), {});
fs.writeFileSync(mainPath, JSON.stringify(main, null, 2));
console.log("\nmerged into summary.json →", JSON.stringify(main.counts));
