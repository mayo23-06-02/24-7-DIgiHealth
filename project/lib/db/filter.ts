import { isUuid, toId } from "./ids";
import type { ColKind, Cond, ListSpec } from "./types";

/** What the compiler needs from a model to translate field paths. */
export interface FieldResolver {
  modelName: string;
  /** Resolve a Mongo-style field path to a column (and optional JSON sub-path). */
  column(path: string): { col: string; kind: ColKind; jsonPath?: string[] } | undefined;
  /** If `path` is a join-table-backed id list, return its spec. */
  list(path: string): { spec: ListSpec; ownerPathCol: string | undefined } | undefined;
  /** Run `select <valueCol|ownerCol> from <table> where ...`. Used for list-field filters. */
  lookupList(spec: ListSpec, valueCol: "ownerCol" | "valueCol", where: Cond): Promise<string[]>;
}

const NEVER: Cond = { k: "never" };
const ALWAYS: Cond = { k: "always" };

export const and = (items: Cond[]): Cond => {
  const out: Cond[] = [];
  for (const c of items) {
    if (c.k === "never") return NEVER;
    if (c.k === "always") continue;
    if (c.k === "and") out.push(...c.items);
    else out.push(c);
  }
  if (out.length === 0) return ALWAYS;
  return out.length === 1 ? out[0] : { k: "and", items: out };
};

export const or = (items: Cond[]): Cond => {
  const out: Cond[] = [];
  for (const c of items) {
    if (c.k === "always") return ALWAYS;
    if (c.k === "never") continue;
    if (c.k === "or") out.push(...c.items);
    else out.push(c);
  }
  if (out.length === 0) return NEVER;
  return out.length === 1 ? out[0] : { k: "or", items: out };
};

const isOperatorObject = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v) && !(v instanceof Date) && !(v instanceof RegExp) &&
  Object.keys(v as object).length > 0 && Object.keys(v as object).every((k) => k.startsWith("$"));

function encodeValue(kind: ColKind, v: unknown): unknown {
  if (v instanceof Date) return kind === "date" ? v.toISOString().slice(0, 10) : v.toISOString();
  if (kind === "uuid" || kind === "uuid[]") return toId(v);
  if (v && typeof v === "object" && !Array.isArray(v)) {
    const id = toId(v);
    return id;
  }
  return v;
}

/** Strip escaping added by lib/escapeRegex so the regex can be passed to Postgres. */
function regexSource(v: unknown): { source: string; ci: boolean } {
  if (v instanceof RegExp) return { source: v.source, ci: v.flags.includes("i") };
  return { source: String(v), ci: false };
}

function leaf(col: string, op: string, val?: unknown): Cond {
  return { k: "leaf", col, op, val };
}

function colExpr(col: string, jsonPath?: string[]): string {
  if (!jsonPath?.length) return col;
  return jsonPath.length === 1
    ? `${col}->>${jsonPath[0]}`
    : `${col}->${jsonPath.slice(0, -1).join("->")}->>${jsonPath[jsonPath.length - 1]}`;
}

async function fieldCond(r: FieldResolver, path: string, value: unknown): Promise<Cond> {
  // Join-table id lists: translate to "owner key in (select owners ...)".
  const list = r.list(path);
  if (list) {
    const { spec, ownerPathCol } = list;
    const valuesOf = (v: unknown): string[] => {
      if (isOperatorObject(v)) {
        const o = v as Record<string, unknown>;
        if (o.$in) return (o.$in as unknown[]).map((x) => toId(x)!).filter(isUuid);
        if (o.$eq !== undefined) return [toId(o.$eq)!].filter(isUuid);
        throw new Error(`${r.modelName}.${path}: unsupported list operator ${Object.keys(o).join(",")}`);
      }
      return [toId(v)!].filter(isUuid);
    };
    const vals = valuesOf(value);
    if (vals.length === 0) return NEVER;
    const where: Cond = and([
      leaf(spec.valueCol, "in", vals),
      ...Object.entries(spec.where ?? {}).map(([c, v]) => leaf(c, "eq", v)),
    ]);
    const owners = await r.lookupList(spec, "ownerCol", where);
    if (owners.length === 0) return NEVER;
    return leaf(ownerPathCol ?? "id", "in", owners);
  }

  const target = r.column(path);
  if (!target) throw new Error(`Query on unmapped field "${path}" of ${r.modelName}`);
  const { col, kind, jsonPath } = target;
  const c = colExpr(col, jsonPath);
  const isArr = kind.endsWith("[]");
  const base = (isArr ? kind.slice(0, -2) : kind) as ColKind;
  const jsonSub = !!jsonPath?.length;
  const enc = (v: unknown) => (jsonSub ? v : encodeValue(base, v));
  const idOk = (v: unknown) => base !== "uuid" || isUuid(v);

  if (value instanceof RegExp) return fieldCond(r, path, { $regex: value });
  if (!isOperatorObject(value)) {
    if (value === null || value === undefined) return leaf(c, "is", null);
    if (isArr) {
      const e = enc(value);
      return idOk(e) ? leaf(c, "cs", [e]) : NEVER;
    }
    const e = enc(value);
    return idOk(e) ? leaf(c, "eq", e) : NEVER;
  }

  const parts: Cond[] = [];
  const ops = value as Record<string, unknown>;
  for (const [op, raw] of Object.entries(ops)) {
    switch (op) {
      case "$options":
        break;
      case "$eq":
        parts.push(await fieldCond(r, path, raw));
        break;
      case "$ne": {
        if (raw === null || raw === undefined) {
          parts.push(leaf(c, "not.is", null));
          break;
        }
        const e = enc(raw);
        if (!idOk(e)) break; // can never equal -> matches everything
        parts.push(or([leaf(c, "is", null), isArr ? leaf(c, "not.cs", [e]) : leaf(c, "neq", e)]));
        break;
      }
      case "$gt":
      case "$gte":
      case "$lt":
      case "$lte":
        parts.push(leaf(c, op.slice(1), enc(raw)));
        break;
      case "$in": {
        const arr = (raw as unknown[]) ?? [];
        const hasNull = arr.some((x) => x === null || x === undefined);
        const vals = arr.filter((x) => x !== null && x !== undefined).map(enc).filter(idOk);
        const conds: Cond[] = [];
        if (hasNull) conds.push(leaf(c, "is", null));
        if (vals.length) conds.push(isArr ? leaf(c, "ov", vals) : leaf(c, "in", vals));
        parts.push(or(conds));
        break;
      }
      case "$nin": {
        const arr = ((raw as unknown[]) ?? []).filter((x) => x !== null && x !== undefined).map(enc).filter(idOk);
        if (arr.length === 0) break;
        parts.push(or([leaf(c, "is", null), isArr ? leaf(c, "not.ov", arr) : leaf(c, "not.in", arr)]));
        break;
      }
      case "$all":
        parts.push(leaf(c, "cs", ((raw as unknown[]) ?? []).map(enc)));
        break;
      case "$exists":
        parts.push(leaf(c, raw ? "not.is" : "is", null));
        break;
      case "$regex": {
        const { source, ci } = regexSource(raw);
        const flags = String(ops.$options ?? "");
        parts.push(leaf(c, ci || flags.includes("i") ? "imatch" : "match", source));
        break;
      }
      case "$not": {
        parts.push(negate(await fieldCond(r, path, raw)));
        break;
      }
      default:
        throw new Error(`Unsupported query operator ${op} on ${r.modelName}.${path}`);
    }
  }
  return and(parts);
}

/** Only used for `$not` over simple leaves. */
function negate(c: Cond): Cond {
  if (c.k === "leaf") {
    if (c.op.startsWith("not.")) return { ...c, op: c.op.slice(4) };
    return { ...c, op: `not.${c.op}` };
  }
  throw new Error("$not only supported over single-field operators");
}

/** Compile a Mongo-style filter into a condition tree. */
export async function compileFilter(r: FieldResolver, filter: Record<string, unknown> | undefined): Promise<Cond> {
  if (!filter) return ALWAYS;
  const parts: Cond[] = [];
  for (const [key, value] of Object.entries(filter)) {
    if (value === undefined) continue;
    if (key === "$or") {
      parts.push(or(await Promise.all((value as Record<string, unknown>[]).map((f) => compileFilter(r, f)))));
    } else if (key === "$and") {
      parts.push(and(await Promise.all((value as Record<string, unknown>[]).map((f) => compileFilter(r, f)))));
    } else if (key === "$nor") {
      throw new Error("$nor is not supported");
    } else if (key.startsWith("$")) {
      throw new Error(`Unsupported top-level operator ${key}`);
    } else {
      parts.push(await fieldCond(r, key, value));
    }
  }
  return and(parts);
}

// ── rendering ────────────────────────────────────────────────────────────────

const q = (v: unknown): string => `"${String(v).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;

function pgArray(vals: unknown[]): string {
  return `{${vals.map((v) => q(v)).join(",")}}`;
}

function fmt(op: string, val: unknown, quoted: boolean): string {
  const bare = op.replace(/^not\./, "");
  switch (bare) {
    case "in":
      return `(${(val as unknown[]).map((v) => q(v)).join(",")})`;
    case "is":
      return val === null ? "null" : String(val);
    case "cs":
    case "ov":
      return pgArray(val as unknown[]);
    default:
      return quoted ? q(val) : String(val);
  }
}

/** Render a condition as an element of PostgREST's `or=(...)` / `and(...)` syntax. */
export function renderLogic(c: Cond): string {
  switch (c.k) {
    case "leaf":
      return `${c.col}.${c.op}.${fmt(c.op, c.val, true)}`;
    case "and":
      return `and(${c.items.map(renderLogic).join(",")})`;
    case "or":
      return `or(${c.items.map(renderLogic).join(",")})`;
    default:
      throw new Error("cannot render constant condition");
  }
}

/** Minimal builder surface used by applyCond. */
interface FilterBuilder<B> {
  filter(column: string, operator: string, value: unknown): B;
  or(filters: string): B;
}

/** Apply an (already simplified, non-constant) condition tree to a PostgREST builder. */
export function applyCond<B extends FilterBuilder<B>>(builder: B, c: Cond): B {
  switch (c.k) {
    case "always":
      return builder;
    case "never":
      throw new Error("applyCond called with never");
    case "leaf":
      return builder.filter(c.col, c.op, fmt(c.op, c.val, false));
    case "and":
      return c.items.reduce((b, item) => applyCond(b, item), builder);
    case "or":
      return builder.or(c.items.map(renderLogic).join(","));
  }
}

/** Find a top-level `in` leaf with many values so the caller can chunk the request. */
export function findBigIn(c: Cond, limit: number): { path: number[]; leaf: Extract<Cond, { k: "leaf" }> } | undefined {
  if (c.k === "leaf" && c.op === "in" && (c.val as unknown[]).length > limit) return { path: [], leaf: c };
  if (c.k === "and") {
    for (let i = 0; i < c.items.length; i++) {
      const it = c.items[i];
      if (it.k === "leaf" && it.op === "in" && (it.val as unknown[]).length > limit) return { path: [i], leaf: it };
    }
  }
  return undefined;
}

export function replaceLeaf(c: Cond, at: number[], next: Cond): Cond {
  if (at.length === 0) return next;
  if (c.k !== "and") return c;
  const items = c.items.slice();
  items[at[0]] = next;
  return { k: "and", items };
}
