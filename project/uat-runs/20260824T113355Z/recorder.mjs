import fs from "fs";
import path from "path";

/**
 * Session recorder for a UAT run.
 *
 * Every request and its response is appended to session.jsonl as it happens,
 * so a run that crashes half way still leaves a usable record rather than
 * losing everything held in memory.
 */
export class Recorder {
  constructor(dir, base) {
    this.dir = dir;
    this.base = base;
    this.steps = [];
    this.jsonl = path.join(dir, "session.jsonl");
    this.logFile = path.join(dir, "session.log");
    fs.writeFileSync(this.jsonl, "");
    fs.writeFileSync(this.logFile, "");
  }

  line(text) {
    process.stdout.write(text + "\n");
    fs.appendFileSync(this.logFile, text + "\n");
  }

  section(title) {
    this.line("\n" + "═".repeat(72));
    this.line(title);
    this.line("═".repeat(72));
  }

  /** Record one verified expectation. */
  check(id, area, name, pass, detail, extra = {}) {
    const step = {
      id,
      area,
      name,
      status: pass === null ? "SKIP" : pass ? "PASS" : "FAIL",
      detail,
      at: new Date().toISOString(),
      ...extra,
    };
    this.steps.push(step);
    fs.appendFileSync(this.jsonl, JSON.stringify(step) + "\n");
    const tag = { PASS: "PASS", FAIL: "FAIL", SKIP: "SKIP" }[step.status];
    this.line(`  ${tag}  ${id.padEnd(7)} ${name}${detail ? "  — " + detail : ""}`);
    return pass;
  }

  /** Perform a request and record the full exchange. */
  async call(session, method, pathname, opts = {}) {
    const started = Date.now();
    let res, bodyText = "", err = null;
    try {
      res = await session.fetch(pathname, { method, ...opts });
      const ct = res.headers.get("content-type") || "";
      if (ct.includes("application/pdf")) {
        bodyText = `<pdf ${(await res.arrayBuffer()).byteLength} bytes>`;
      } else {
        bodyText = await res.text();
      }
    } catch (e) {
      err = String(e);
    }
    const record = {
      kind: "request",
      method,
      path: pathname,
      status: res?.status ?? null,
      ms: Date.now() - started,
      location: res?.headers.get("location") || null,
      contentType: res?.headers.get("content-type") || null,
      // Truncated in the record only — callers get the full body to parse.
      body: bodyText.slice(0, 800),
      error: err,
      at: new Date().toISOString(),
    };
    fs.appendFileSync(this.jsonl, JSON.stringify(record) + "\n");
    return { res, bodyText, record };
  }

  finish(meta) {
    const counts = this.steps.reduce(
      (a, s) => ((a[s.status] = (a[s.status] || 0) + 1), a),
      {},
    );
    const summary = { ...meta, counts, total: this.steps.length, steps: this.steps };
    fs.writeFileSync(
      path.join(this.dir, "summary.json"),
      JSON.stringify(summary, null, 2),
    );
    this.section("SUMMARY");
    this.line(
      `  ${this.steps.length} checks · PASS ${counts.PASS || 0} · FAIL ${counts.FAIL || 0} · SKIP ${counts.SKIP || 0}`,
    );
    const failures = this.steps.filter((s) => s.status === "FAIL");
    if (failures.length) {
      this.line("\n  Failures:");
      for (const f of failures) this.line(`   · ${f.id} ${f.name} — ${f.detail}`);
    }
    return summary;
  }
}

/** Cookie-jar session so each role's run is isolated from the others. */
export function makeSession(base, label) {
  const jar = new Map();
  return {
    label,
    cookie: () => [...jar].map(([k, v]) => `${k}=${v}`).join("; "),
    async fetch(pathname, opts = {}) {
      const res = await fetch(base + pathname, {
        ...opts,
        headers: { ...(opts.headers || {}), cookie: this.cookie() },
        redirect: "manual",
      });
      for (const c of res.headers.getSetCookie?.() || []) {
        const [kv] = c.split(";");
        const i = kv.indexOf("=");
        jar.set(kv.slice(0, i).trim(), kv.slice(i + 1));
      }
      return res;
    },
  };
}

export const json = (o) => ({
  headers: { "content-type": "application/json" },
  body: JSON.stringify(o),
});
