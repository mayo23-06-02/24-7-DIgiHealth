import { getSupabaseAdmin } from "@/lib/supabase/server";
import { DB_SCHEMA } from "./schema.generated";
import { toDbError } from "./errors";
import { isUuid, toId } from "./ids";
import { camel, snake } from "./naming";
import { and, applyCond, compileFilter, findBigIn, replaceLeaf, type FieldResolver } from "./filter";
import type { ChildSpec, ColKind, Cond, ListSpec, ModelConfig, SortSpec } from "./types";

type AnyRec = Record<string, any>;
export type Filter = AnyRec;

const PAGE = 1000;
const BIG_IN = 150;

// ── small helpers ────────────────────────────────────────────────────────────

const isPlain = (v: unknown): v is AnyRec =>
  !!v && typeof v === "object" && !Array.isArray(v) && !(v instanceof Date) && Object.getPrototypeOf(v) === Object.prototype;

function setPath(obj: AnyRec, path: string, value: unknown) {
  const parts = path.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!isPlain(cur[parts[i]])) cur[parts[i]] = {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}

function getPath(obj: AnyRec, path: string): any {
  let cur: any = obj;
  for (const p of path.split(".")) {
    if (cur === null || cur === undefined) return undefined;
    cur = cur[p];
  }
  return cur;
}

function decode(kind: ColKind, v: unknown): unknown {
  if (v === null || v === undefined) return kind.endsWith("[]") ? [] : undefined;
  switch (kind) {
    case "timestamptz":
      return new Date(v as string);
    case "date":
      return new Date(`${v}T00:00:00.000Z`);
    default:
      return v;
  }
}

function encode(kind: ColKind, v: unknown): unknown {
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (v instanceof Date) return kind === "date" ? v.toISOString().slice(0, 10) : v.toISOString();
  if (kind === "uuid") return toId(v);
  if (kind === "uuid[]") return Array.isArray(v) ? v.map((x) => toId(x)) : v;
  if (kind === "timestamptz" && typeof v === "number") return new Date(v).toISOString();
  if (kind === "json") return JSON.parse(JSON.stringify(v));
  return v;
}

const clone = <T,>(v: T): T => (v === undefined ? v : (structuredClone(v) as T));

function sortComparator(rt: Runtime, spec: SortSpec | undefined): ((a: AnyRec, b: AnyRec) => number) | undefined {
  const keys = parseSort(spec);
  if (!keys.length) return undefined;
  return (a, b) => {
    for (const { path, asc } of keys) {
      const x = getPath(a, path);
      const y = getPath(b, path);
      if (x === y) continue;
      if (x === undefined || x === null) return asc ? -1 : 1;
      if (y === undefined || y === null) return asc ? 1 : -1;
      const xv = x instanceof Date ? x.getTime() : x;
      const yv = y instanceof Date ? y.getTime() : y;
      if (xv < yv) return asc ? -1 : 1;
      if (xv > yv) return asc ? 1 : -1;
    }
    return 0;
  };
}

function parseSort(spec: SortSpec | undefined): { path: string; asc: boolean }[] {
  if (!spec) return [];
  if (typeof spec === "string") {
    return spec
      .split(/\s+/)
      .filter(Boolean)
      .map((t) => (t.startsWith("-") ? { path: t.slice(1), asc: false } : { path: t.replace(/^\+/, ""), asc: true }));
  }
  if (Array.isArray(spec)) return spec.map(([path, dir]) => ({ path, asc: dir === 1 }));
  return Object.entries(spec).map(([path, dir]) => ({
    path,
    asc: dir === 1 || dir === "asc" || dir === "ascending",
  }));
}

const warned = new Set<string>();
/** Unknown fields are dropped (the DB has no column for them); say so once per field. */
function warnUnmapped(model: string, path: string) {
  const key = `${model}.${path}`;
  if (warned.has(key)) return;
  warned.add(key);
  console.warn(`[db] ${key} has no column and was not persisted`);
}

// ── registry ─────────────────────────────────────────────────────────────────

const registry = new Map<string, Runtime>();

// ── runtime (one per model) ──────────────────────────────────────────────────

class Runtime implements FieldResolver {
  readonly cols: Record<string, ColKind>;
  private readonly colToPath = new Map<string, string>();
  private readonly pathToCol = new Map<string, string | null>();
  readonly modelName: string;

  constructor(public cfg: ModelConfig) {
    this.modelName = cfg.name;
    const cols = DB_SCHEMA[cfg.table];
    if (!cols) throw new Error(`Table ${cfg.table} not found in generated schema (run scripts/gen-db-schema.mjs)`);
    this.cols = cols;
    const explicit = new Map<string, string>();
    for (const [p, c] of Object.entries(cfg.columns ?? {})) explicit.set(c, p);
    const nests = Object.entries(cfg.nest ?? {}).sort((a, b) => b[1].length - a[1].length);
    for (const col of Object.keys(cols)) {
      if (col === "mongo_id" || cfg.hidden?.includes(col)) continue;
      if (col === "id") {
        this.colToPath.set(col, "id");
        continue;
      }
      const ex = explicit.get(col);
      if (ex) {
        this.colToPath.set(col, ex);
        continue;
      }
      const nest = nests.find(([, prefix]) => col.startsWith(prefix) && col.length > prefix.length);
      this.colToPath.set(col, nest ? `${nest[0]}.${camel(col.slice(nest[1].length))}` : camel(col));
    }
    registry.set(cfg.name, this);
  }

  get table() {
    return this.cfg.table;
  }

  pathOf(col: string): string | undefined {
    return this.colToPath.get(col);
  }

  /** Mongo path -> column name, or undefined when the path is not a plain column. */
  colOf(path: string): string | undefined {
    if (path === "_id" || path === "id") return "id";
    const hit = this.pathToCol.get(path);
    if (hit !== undefined) return hit ?? undefined;
    let found: string | undefined;
    const cfg = this.cfg;
    if (cfg.columns?.[path] && this.cols[cfg.columns[path]]) found = cfg.columns[path];
    if (!found && cfg.aliases?.[path] && this.cols[cfg.aliases[path]]) found = cfg.aliases[path];
    if (!found) {
      const top = path.split(".")[0];
      const prefix = cfg.nest?.[top];
      if (prefix && path.includes(".")) {
        const cand = prefix + snake(path.slice(top.length + 1).replace(/\./g, "_"));
        if (this.cols[cand]) found = cand;
      }
    }
    if (!found) {
      const cand = snake(path.replace(/\./g, "_"));
      if (this.cols[cand] && cand !== "mongo_id" && !cfg.hidden?.includes(cand)) found = cand;
    }
    this.pathToCol.set(path, found ?? null);
    return found;
  }

  // FieldResolver
  column(path: string) {
    const direct = this.colOf(path);
    if (direct) return { col: direct, kind: this.cols[direct] };
    // JSON sub-path: find the longest prefix that maps to a json column.
    const parts = path.split(".");
    for (let i = parts.length - 1; i >= 1; i--) {
      const col = this.colOf(parts.slice(0, i).join("."));
      if (col && this.cols[col] === "json") return { col, kind: "json" as ColKind, jsonPath: parts.slice(i) };
    }
    return undefined;
  }

  list(path: string) {
    const spec = this.cfg.lists?.[path];
    if (!spec) return undefined;
    return { spec, ownerPathCol: spec.ownerKeyCol };
  }

  async lookupList(spec: ListSpec, which: "ownerCol" | "valueCol", where: Cond): Promise<string[]> {
    const col = which === "ownerCol" ? spec.ownerCol : spec.valueCol;
    const out = new Set<string>();
    let offset = 0;
    for (;;) {
      let query = getSupabaseAdmin().from(spec.table).select(col);
      if (where.k === "never") return [];
      query = applyCond(query as any, where) as any;
      const { data, error } = await (query as any).range(offset, offset + PAGE - 1);
      if (error) throw toDbError(error, `${this.modelName}.lookupList`);
      for (const row of data as AnyRec[]) out.add(row[col]);
      if ((data as AnyRec[]).length < PAGE) break;
      offset += PAGE;
    }
    return [...out];
  }

  isExtraPath(path: string): boolean {
    return !!(this.cfg.lists?.[path] || this.cfg.children?.[path]);
  }

  // ── row <-> doc ────────────────────────────────────────────────────────────

  fromRow(row: AnyRec): AnyRec {
    const doc: AnyRec = {};
    for (const [col, val] of Object.entries(row)) {
      const path = this.colToPath.get(col);
      if (!path) continue;
      const kind = this.cols[col];
      const v = decode(kind, val);
      if (v === undefined) continue;
      setPath(doc, path, v);
    }
    doc._id = row.id;
    doc.id = row.id;
    this.cfg.fromRow?.(doc, row);
    return doc;
  }

  /** Flatten a (possibly partial) doc into column -> value. */
  toRow(data: AnyRec): AnyRec {
    const row: AnyRec = {};
    const visit = (path: string, v: unknown) => {
      if (v === undefined) return;
      if (this.isExtraPath(path) || this.cfg.virtualPaths?.[path]) return;
      const col = this.colOf(path);
      if (col && col !== "id") {
        row[col] = encode(this.cols[col], v);
        return;
      }
      if (isPlain(v)) {
        for (const [k, sub] of Object.entries(v)) visit(`${path}.${k}`, sub);
        return;
      }
      warnUnmapped(this.modelName, path);
    };
    for (const [k, v] of Object.entries(data)) {
      if (k === "_id" || k === "id" || k === "__v") continue;
      visit(k, v);
    }
    this.cfg.toRow?.(row, data);
    return row;
  }

  // ── projection ─────────────────────────────────────────────────────────────

  projection(spec: unknown): { cols: string[] | "*"; extras: Set<string> | "all" } {
    const tokens: { path: string; include: boolean }[] = [];
    if (typeof spec === "string") {
      for (const t of spec.split(/\s+/).filter(Boolean)) {
        if (t.startsWith("-")) tokens.push({ path: t.slice(1), include: false });
        else tokens.push({ path: t.replace(/^\+/, ""), include: true });
      }
    } else if (isPlain(spec)) {
      for (const [p, v] of Object.entries(spec)) tokens.push({ path: p, include: !!v && v !== 0 });
    }
    if (!tokens.length) return { cols: "*", extras: "all" };

    const allPaths = [...this.colToPath.entries()];
    const match = (p: string) => allPaths.filter(([, path]) => path === p || path.startsWith(`${p}.`) || (p === "_id" && path === "id")).map(([c]) => c);
    const extraNames = [...Object.keys(this.cfg.lists ?? {}), ...Object.keys(this.cfg.children ?? {})];
    const includes = tokens.filter((t) => t.include && t.path !== "_id");
    const excludes = tokens.filter((t) => !t.include && t.path !== "_id");
    if (includes.length) {
      const cols = new Set<string>(["id"]);
      const extras = new Set<string>();
      for (const t of includes) {
        if (extraNames.includes(t.path)) extras.add(t.path);
        const hit = match(t.path);
        hit.forEach((c) => cols.add(c));
        // fields synthesised by fromRow need their source columns
        for (const [vp, v] of Object.entries(this.cfg.virtualPaths ?? {})) {
          if (vp === t.path || vp.startsWith(`${t.path}.`)) v.cols.forEach((c) => cols.add(c));
        }
      }
      return { cols: [...cols], extras };
    }
    const dropCols = new Set<string>();
    const dropExtras = new Set<string>();
    for (const t of excludes) {
      if (extraNames.includes(t.path)) dropExtras.add(t.path);
      match(t.path).forEach((c) => dropCols.add(c));
    }
    const cols = [...this.colToPath.keys()].filter((c) => !dropCols.has(c));
    return { cols, extras: new Set(extraNames.filter((e) => !dropExtras.has(e))) };
  }

  // ── extras: lists + children ───────────────────────────────────────────────

  async attachExtras(docs: AnyRec[], extras: Set<string> | "all") {
    if (!docs.length) return;
    const wants = (name: string) => extras === "all" || extras.has(name);
    const db = getSupabaseAdmin();
    for (const [name, spec] of Object.entries(this.cfg.lists ?? {})) {
      if (!wants(name)) continue;
      const ownerPath = spec.ownerKeyCol ? this.pathOf(spec.ownerKeyCol) ?? "id" : "id";
      const owners = [...new Set(docs.map((d) => getPath(d, ownerPath)).filter(Boolean))] as string[];
      const grouped = new Map<string, string[]>();
      for (const chunk of chunks(owners, BIG_IN)) {
        let query: any = db.from(spec.table).select(`${spec.ownerCol}, ${spec.valueCol}`).in(spec.ownerCol, chunk);
        for (const [c, v] of Object.entries(spec.where ?? {})) query = query.eq(c, v);
        const { data, error } = await query;
        if (error) throw toDbError(error, `${this.modelName}.${name}`);
        for (const r of data as AnyRec[]) {
          const k = r[spec.ownerCol];
          if (!grouped.has(k)) grouped.set(k, []);
          grouped.get(k)!.push(r[spec.valueCol]);
        }
      }
      for (const d of docs) d[name] = grouped.get(getPath(d, ownerPath)) ?? [];
    }
    for (const [name, spec] of Object.entries(this.cfg.children ?? {})) {
      if (!wants(name)) continue;
      const ids = docs.map((d) => d.id as string);
      const kinds = DB_SCHEMA[spec.table];
      const rev = new Map<string, string>();
      for (const [f, c] of Object.entries(spec.fields ?? {})) rev.set(c, f);
      const grouped = new Map<string, AnyRec[]>();
      for (const chunk of chunks(ids, BIG_IN)) {
        let query: any = db.from(spec.table).select("*").in(spec.fk, chunk);
        if (spec.orderBy) query = query.order(spec.orderBy, { ascending: true });
        const { data, error } = await query;
        if (error) throw toDbError(error, `${this.modelName}.${name}`);
        for (const r of data as AnyRec[]) {
          const sub: AnyRec = {};
          for (const [c, v] of Object.entries(r)) {
            if (c === spec.fk || c === "mongo_id") continue;
            const dv = decode(kinds[c], v);
            if (dv === undefined) continue;
            sub[rev.get(c) ?? camel(c)] = dv;
          }
          sub._id = r.id;
          const k = r[spec.fk];
          if (!grouped.has(k)) grouped.set(k, []);
          grouped.get(k)!.push(sub);
        }
      }
      for (const d of docs) d[name] = grouped.get(d.id) ?? [];
    }
  }

  childRow(spec: ChildSpec, parentId: string, item: AnyRec): AnyRec {
    const kinds = DB_SCHEMA[spec.table];
    const row: AnyRec = { [spec.fk]: parentId };
    for (const [f, v] of Object.entries(item)) {
      if (f === "_id" || f === "id" || v === undefined) continue;
      const col = spec.fields?.[f] ?? snake(f);
      if (kinds[col]) row[col] = encode(kinds[col], v);
    }
    return row;
  }

  async writeExtras(parentId: string, data: AnyRec, mode: "replace" | "insert") {
    const db = getSupabaseAdmin();
    for (const [name, spec] of Object.entries(this.cfg.lists ?? {})) {
      if (data[name] === undefined) continue;
      const values = ((data[name] as unknown[]) ?? []).map((v) => toId(v)).filter(isUuid);
      await this.replaceList(parentId, name, spec, values, mode === "replace", data);
    }
    for (const [name, spec] of Object.entries(this.cfg.children ?? {})) {
      if (data[name] === undefined) continue;
      if (mode === "replace") {
        const { error } = await db.from(spec.table).delete().eq(spec.fk, parentId);
        if (error) throw toDbError(error, `${this.modelName}.${name}`);
      }
      const items = (data[name] as AnyRec[]) ?? [];
      if (items.length) {
        const { error } = await db.from(spec.table).insert(items.map((i) => this.childRow(spec, parentId, i)));
        if (error) throw toDbError(error, `${this.modelName}.${name}`);
      }
    }
  }

  async ownerKeyValue(spec: ListSpec, parentId: string, hint?: AnyRec): Promise<string> {
    if (!spec.ownerKeyCol) return parentId;
    const path = this.pathOf(spec.ownerKeyCol);
    const known = hint && path ? getPath(hint, path) : undefined;
    if (known) return toId(known)!;
    const { data, error } = await getSupabaseAdmin().from(this.table).select(spec.ownerKeyCol).eq("id", parentId).maybeSingle();
    if (error) throw toDbError(error, `${this.modelName}.ownerKey`);
    return (data as AnyRec)?.[spec.ownerKeyCol];
  }

  async replaceList(parentId: string, _name: string, spec: ListSpec, values: string[], deleteFirst: boolean, hint?: AnyRec) {
    const db = getSupabaseAdmin();
    const owner = await this.ownerKeyValue(spec, parentId, hint);
    if (deleteFirst) {
      let del: any = db.from(spec.table).delete().eq(spec.ownerCol, owner);
      for (const [c, v] of Object.entries(spec.where ?? {})) del = del.eq(c, v);
      const { error } = await del;
      if (error) throw toDbError(error, `${this.modelName}.list`);
    }
    if (values.length) {
      const rows = [...new Set(values)].map((v) => ({ [spec.ownerCol]: owner, [spec.valueCol]: v, ...(spec.where ?? {}) }));
      const { error } = await db.from(spec.table).upsert(rows, { onConflict: [spec.ownerCol, spec.valueCol, ...Object.keys(spec.where ?? {})].join(","), ignoreDuplicates: true });
      if (error) throw toDbError(error, `${this.modelName}.list`);
    }
  }
}

function chunks<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// ── documents ────────────────────────────────────────────────────────────────

const DOC_METHODS = ["save", "toObject", "toJSON", "get", "set", "markModified", "isModified", "populate", "deleteOne", "remove", "unmarkModified"] as const;

function makeDoc(rt: Runtime, data: AnyRec, isNew: boolean): AnyRec {
  const doc: AnyRec = Object.assign({}, data);
  const snapshot = isNew ? undefined : snapshotOf(rt, doc);
  const meta = { isNew, snapshot };
  Object.defineProperty(doc, "__meta", { value: meta, enumerable: false, writable: true });
  Object.defineProperty(doc, "isNew", { get: () => meta.isNew, enumerable: false });
  const methods: Record<(typeof DOC_METHODS)[number], (...args: any[]) => any> = {
    async save() {
      return saveDoc(rt, doc);
    },
    toObject() {
      return toPlain(doc);
    },
    toJSON() {
      return toPlain(doc);
    },
    get(path: string) {
      return getPath(doc, path);
    },
    set(path: string | AnyRec, value?: unknown) {
      if (typeof path === "string") setPath(doc, path, value);
      else for (const [k, v] of Object.entries(path)) setPath(doc, k, v);
      return doc;
    },
    markModified() {},
    unmarkModified() {},
    isModified(path?: string) {
      if (meta.isNew) return true;
      const cur = snapshotOf(rt, doc);
      const prev = meta.snapshot!;
      if (!path) return JSON.stringify(cur) !== JSON.stringify(prev);
      const col = rt.colOf(path);
      if (col) return JSON.stringify(cur.row[col]) !== JSON.stringify(prev.row[col]);
      return JSON.stringify(cur.extras[path]) !== JSON.stringify(prev.extras[path]);
    },
    async populate(path: unknown, select?: unknown) {
      await populateDocs(rt, [doc], normalisePopulate(path, select));
      return doc;
    },
    async deleteOne() {
      const { error } = await getSupabaseAdmin().from(rt.table).delete().eq("id", doc.id);
      if (error) throw toDbError(error, `${rt.modelName}.deleteOne`);
      return { deletedCount: 1 };
    },
    async remove() {
      return doc.deleteOne();
    },
  };
  for (const name of DOC_METHODS) {
    Object.defineProperty(doc, name, { value: methods[name], enumerable: false, writable: true, configurable: true });
  }
  return doc;
}

function toPlain(doc: AnyRec): AnyRec {
  const out: AnyRec = {};
  for (const [k, v] of Object.entries(doc)) out[k] = plainValue(v);
  return out;
}

function plainValue(v: unknown): unknown {
  if (v instanceof Date) return new Date(v.getTime());
  if (Array.isArray(v)) return v.map(plainValue);
  if (v && typeof v === "object") {
    if (typeof (v as AnyRec).toObject === "function") return (v as AnyRec).toObject();
    const o: AnyRec = {};
    for (const [k, x] of Object.entries(v)) o[k] = plainValue(x);
    return o;
  }
  return v;
}

function snapshotOf(rt: Runtime, doc: AnyRec) {
  const row = rt.toRow(doc);
  const extras: AnyRec = {};
  for (const name of [...Object.keys(rt.cfg.lists ?? {}), ...Object.keys(rt.cfg.children ?? {})]) {
    if (doc[name] !== undefined) {
      extras[name] = clone(
        Array.isArray(doc[name]) ? doc[name].map((x: unknown) => (isPlain(x) ? stripId(x) : toId(x))) : doc[name],
      );
    }
  }
  return JSON.parse(JSON.stringify({ row, extras }));
}

const stripId = (o: AnyRec) => {
  const { _id, id, ...rest } = o;
  return rest;
};

async function saveDoc(rt: Runtime, doc: AnyRec): Promise<AnyRec> {
  const meta = doc.__meta as { isNew: boolean; snapshot?: { row: AnyRec; extras: AnyRec } };
  if (meta.isNew) {
    const created = await insertOne(rt, plainForInsert(doc));
    Object.assign(doc, created);
    meta.isNew = false;
    meta.snapshot = snapshotOf(rt, doc);
    return doc;
  }
  const cur = snapshotOf(rt, doc);
  const prev = meta.snapshot!;
  const patch: AnyRec = {};
  for (const [c, v] of Object.entries(cur.row)) {
    if (JSON.stringify(v) !== JSON.stringify(prev.row[c])) patch[c] = v;
  }
  for (const c of Object.keys(prev.row)) if (!(c in cur.row)) patch[c] = null;
  const db = getSupabaseAdmin();
  if (Object.keys(patch).length) {
    const { data, error } = await db.from(rt.table).update(patch).eq("id", doc.id).select("*").maybeSingle();
    if (error) throw toDbError(error, `${rt.modelName}.save`);
    if (data && (data as AnyRec).updated_at) {
      const p = rt.pathOf("updated_at");
      if (p) setPath(doc, p, new Date((data as AnyRec).updated_at));
    }
  }
  const changedExtras: AnyRec = {};
  for (const name of Object.keys(cur.extras)) {
    if (JSON.stringify(cur.extras[name]) !== JSON.stringify(prev.extras[name])) changedExtras[name] = doc[name];
  }
  if (Object.keys(changedExtras).length) await rt.writeExtras(doc.id, { ...changedExtras, ...pickOwner(rt, doc) }, "replace");
  meta.snapshot = cur;
  return doc;
}

function pickOwner(rt: Runtime, doc: AnyRec): AnyRec {
  const out: AnyRec = {};
  for (const spec of Object.values(rt.cfg.lists ?? {})) {
    if (spec.ownerKeyCol) {
      const p = rt.pathOf(spec.ownerKeyCol);
      if (p) setPath(out, p, getPath(doc, p));
    }
  }
  return out;
}

function plainForInsert(doc: AnyRec): AnyRec {
  const out = toPlain(doc);
  delete out.id;
  if (!isUuid(out._id)) delete out._id;
  return out;
}

async function insertOne(rt: Runtime, data: AnyRec): Promise<AnyRec> {
  const row = rt.toRow(data);
  if (isUuid(data._id)) row.id = data._id;
  else if (isUuid(data.id)) row.id = data.id;
  const { data: inserted, error } = await getSupabaseAdmin().from(rt.table).insert(row).select("*").single();
  if (error) throw toDbError(error, `${rt.modelName}.create`);
  const doc = rt.fromRow(inserted as AnyRec);
  await rt.writeExtras(doc.id, { ...data, ...pickOwner(rt, doc) }, "insert");
  for (const name of [...Object.keys(rt.cfg.lists ?? {}), ...Object.keys(rt.cfg.children ?? {})]) {
    doc[name] = data[name] !== undefined ? clone(data[name]) : [];
  }
  return doc;
}

// ── populate ─────────────────────────────────────────────────────────────────

interface PopulateSpec {
  path: string;
  select?: unknown;
  model?: ModelClass<any>;
  populate?: PopulateSpec[];
}

function normalisePopulate(arg: unknown, select?: unknown): PopulateSpec[] {
  if (typeof arg === "string") {
    return arg
      .split(/\s+/)
      .filter(Boolean)
      .map((p) => ({ path: p, select }));
  }
  if (Array.isArray(arg)) return arg.flatMap((a) => normalisePopulate(a));
  if (isPlain(arg)) {
    const a = arg as AnyRec;
    return String(a.path)
      .split(/\s+/)
      .filter(Boolean)
      .map((p) => ({
        path: p,
        select: a.select ?? select,
        model: a.model,
        populate: a.populate ? normalisePopulate(a.populate) : undefined,
      }));
  }
  return [];
}

async function populateDocs(rt: Runtime, docs: AnyRec[], specs: PopulateSpec[]) {
  for (const spec of specs) {
    let target = spec.model ? ((spec.model as any).__rt as Runtime) : registry.get(rt.cfg.refs?.[spec.path] ?? "");
    if (!target && !spec.model) {
      // Referenced model has not been imported yet: load the whole model set once.
      await import("@/lib/models");
      target = registry.get(rt.cfg.refs?.[spec.path] ?? "");
    }
    if (!target) throw new Error(`populate("${spec.path}") on ${rt.modelName}: no ref model configured`);
    const ids = new Set<string>();
    for (const d of docs) {
      const v = getPath(d, spec.path);
      for (const x of Array.isArray(v) ? v : [v]) {
        const id = toId(x);
        if (id && isUuid(id) && !(isPlain(x) && x._id && Object.keys(x).length > 1 && !isUuid(x))) ids.add(id);
      }
    }
    if (!ids.size) {
      for (const d of docs) {
        const v = getPath(d, spec.path);
        if (v !== undefined && !Array.isArray(v)) setPath(d, spec.path, null);
      }
      continue;
    }
    const found = new Map<string, AnyRec>();
    const proj = target.projection(spec.select);
    for (const chunk of chunks([...ids], BIG_IN)) {
      const { data, error } = await getSupabaseAdmin()
        .from(target.table)
        .select(proj.cols === "*" ? "*" : proj.cols.join(","))
        .in("id", chunk);
      if (error) throw toDbError(error, `${rt.modelName}.populate(${spec.path})`);
      for (const r of data as unknown as AnyRec[]) found.set(r.id, target.fromRow(r));
    }
    const nested = [...found.values()];
    await target.attachExtras(nested, proj.extras);
    if (spec.populate?.length) await populateDocs(target, nested, spec.populate);
    for (const d of docs) {
      const v = getPath(d, spec.path);
      if (Array.isArray(v)) {
        setPath(d, spec.path, v.map((x) => found.get(toId(x)!)).filter(Boolean));
      } else if (v !== undefined) {
        setPath(d, spec.path, found.get(toId(v)!) ?? null);
      }
    }
  }
}

// ── query ────────────────────────────────────────────────────────────────────

type Op =
  | "find"
  | "findOne"
  | "count"
  | "distinct"
  | "exists"
  | "updateOne"
  | "updateMany"
  | "findOneAndUpdate"
  | "deleteOne"
  | "deleteMany"
  | "findOneAndDelete";

interface QueryState {
  op: Op;
  filter: Filter;
  update?: AnyRec;
  sort?: SortSpec;
  limit?: number;
  skip?: number;
  select?: unknown;
  populates: PopulateSpec[];
  lean: boolean;
  opts: AnyRec;
  field?: string;
}

export class Query<R = any> implements PromiseLike<R> {
  constructor(
    private rt: Runtime,
    private st: QueryState,
  ) {}

  sort(spec: SortSpec): this {
    this.st.sort = spec;
    return this;
  }
  limit(n: number): this {
    this.st.limit = n;
    return this;
  }
  skip(n: number): this {
    this.st.skip = n;
    return this;
  }
  select(spec: unknown): this {
    this.st.select = spec;
    return this;
  }
  populate(arg: unknown, select?: unknown): this {
    this.st.populates.push(...normalisePopulate(arg, select));
    return this;
  }
  lean<L = R>(_opts?: unknown): Query<L> {
    this.st.lean = true;
    return this as unknown as Query<L>;
  }
  /** Query-level distinct: `Model.find(filter).distinct("field")`. */
  distinct(field: string): Query<any[]> {
    this.st.op = "distinct";
    this.st.field = field;
    return this as unknown as Query<any[]>;
  }
  // accepted for Mongoose compatibility, no effect
  session(_s?: unknown): this {
    return this;
  }
  hint(_h?: unknown): this {
    return this;
  }
  maxTimeMS(_n?: number): this {
    return this;
  }
  read(_r?: unknown): this {
    return this;
  }
  setOptions(o: AnyRec): this {
    Object.assign(this.st.opts, o);
    if (o.sort) this.st.sort = o.sort;
    if (o.limit) this.st.limit = o.limit;
    if (o.skip) this.st.skip = o.skip;
    if (o.lean) this.st.lean = true;
    return this;
  }
  exec(): Promise<R> {
    return run(this.rt, this.st) as Promise<R>;
  }
  then<T1 = R, T2 = never>(
    onfulfilled?: ((value: R) => T1 | PromiseLike<T1>) | null,
    onrejected?: ((reason: unknown) => T2 | PromiseLike<T2>) | null,
  ): Promise<T1 | T2> {
    return this.exec().then(onfulfilled, onrejected);
  }
  catch<T = never>(onrejected?: ((reason: unknown) => T | PromiseLike<T>) | null): Promise<R | T> {
    return this.exec().catch(onrejected);
  }
  finally(f?: (() => void) | null): Promise<R> {
    return this.exec().finally(f);
  }
}

function applySortToBuilder(rt: Runtime, builder: any, spec: SortSpec | undefined) {
  let b = builder;
  let hasId = false;
  for (const { path, asc } of parseSort(spec)) {
    const col = rt.colOf(path);
    if (!col) throw new Error(`Sort on unmapped field "${path}" of ${rt.modelName}`);
    if (col === "id") hasId = true;
    // Mongo orders nulls first ascending / last descending; Postgres is the reverse.
    b = b.order(col, { ascending: asc, nullsFirst: asc });
  }
  if (!hasId) b = b.order("id", { ascending: true });
  return b;
}

async function fetchRows(rt: Runtime, cond: Cond, st: QueryState, cols: string): Promise<AnyRec[]> {
  if (cond.k === "never") return [];
  const want = st.limit;
  const skip = st.skip ?? 0;
  const out: AnyRec[] = [];
  let offset = skip;
  for (;;) {
    const size = want === undefined ? PAGE : Math.min(PAGE, want - out.length);
    if (size <= 0) break;
    let b: any = getSupabaseAdmin().from(rt.table).select(cols);
    b = applyCond(b, cond);
    b = applySortToBuilder(rt, b, st.sort);
    const { data, error } = await b.range(offset, offset + size - 1);
    if (error) throw toDbError(error, `${rt.modelName}.find`);
    out.push(...(data as AnyRec[]));
    if ((data as AnyRec[]).length < size) break;
    offset += size;
  }
  return out;
}

/** Query rows, splitting oversized `in (...)` lists across requests. */
async function queryRows(rt: Runtime, cond: Cond, st: QueryState, cols: string): Promise<AnyRec[]> {
  const big = findBigIn(cond, BIG_IN);
  if (!big) return fetchRows(rt, cond, st, cols);
  const seen = new Map<string, AnyRec>();
  const noPage: QueryState = { ...st, limit: undefined, skip: undefined };
  for (const part of chunks(big.leaf.val as unknown[], BIG_IN)) {
    const sub = replaceLeaf(cond, big.path, { ...big.leaf, val: part });
    for (const r of await fetchRows(rt, sub, noPage, cols)) seen.set(r.id, r);
  }
  let rows = [...seen.values()];
  const cmp = sortComparator(rt, st.sort);
  if (cmp) {
    const docs = rows.map((r) => ({ r, d: rt.fromRow(r) }));
    docs.sort((a, b) => cmp(a.d, b.d));
    rows = docs.map((x) => x.r);
  }
  const skip = st.skip ?? 0;
  return st.limit === undefined ? rows.slice(skip) : rows.slice(skip, skip + st.limit);
}

async function matchIds(rt: Runtime, cond: Cond, st: QueryState, one: boolean): Promise<string[]> {
  const rows = await queryRows(rt, cond, { ...st, limit: one ? 1 : st.limit, select: undefined }, "id");
  return rows.map((r) => r.id as string);
}

function wrap(rt: Runtime, doc: AnyRec, lean: boolean): AnyRec {
  return lean ? doc : makeDoc(rt, doc, false);
}

async function hydrateRows(rt: Runtime, rows: AnyRec[], st: QueryState, proj: ReturnType<Runtime["projection"]>): Promise<AnyRec[]> {
  const docs = rows.map((r) => rt.fromRow(r));
  await rt.attachExtras(docs, proj.extras);
  if (st.populates.length) await populateDocs(rt, docs, st.populates);
  return docs.map((d) => wrap(rt, d, st.lean));
}

async function run(rt: Runtime, st: QueryState): Promise<any> {
  const cond = await compileFilter(rt, st.filter);
  const db = getSupabaseAdmin();

  switch (st.op) {
    case "find":
    case "findOne": {
      const proj = rt.projection(st.select);
      const cols = proj.cols === "*" ? "*" : proj.cols.join(",");
      const one = st.op === "findOne";
      const rows = await queryRows(rt, cond, one ? { ...st, limit: 1 } : st, cols);
      const docs = await hydrateRows(rt, rows, st, proj);
      return one ? docs[0] ?? null : docs;
    }
    case "count": {
      if (cond.k === "never") return 0;
      const big = findBigIn(cond, BIG_IN);
      const parts = big ? chunks(big.leaf.val as unknown[], BIG_IN).map((p) => replaceLeaf(cond, big.path, { ...big.leaf, val: p })) : [cond];
      let total = 0;
      for (const c of parts) {
        let b: any = db.from(rt.table).select("id", { count: "exact", head: true });
        b = applyCond(b, c);
        const { count, error } = await b;
        if (error) throw toDbError(error, `${rt.modelName}.count`);
        total += count ?? 0;
      }
      return total;
    }
    case "exists": {
      const rows = await queryRows(rt, cond, { ...st, limit: 1 }, "id");
      return rows[0] ? { _id: rows[0].id } : null;
    }
    case "distinct": {
      const col = rt.colOf(st.field!);
      if (!col) throw new Error(`distinct on unmapped field ${st.field}`);
      const rows = await queryRows(rt, cond, { ...st, sort: undefined }, col);
      const kind = rt.cols[col];
      const out = new Set<unknown>();
      for (const r of rows) {
        const v = r[col];
        if (v === null || v === undefined) continue;
        if (Array.isArray(v)) v.forEach((x) => out.add(x));
        else out.add(decode(kind, v));
      }
      return [...out];
    }
    case "deleteOne":
    case "deleteMany":
    case "findOneAndDelete": {
      const one = st.op !== "deleteMany";
      const rows = await queryRows(rt, cond, { ...st, limit: one ? 1 : undefined }, "*");
      if (!rows.length) return st.op === "findOneAndDelete" ? null : { deletedCount: 0 };
      for (const part of chunks(rows.map((r) => r.id as string), BIG_IN)) {
        const { error } = await db.from(rt.table).delete().in("id", part);
        if (error) throw toDbError(error, `${rt.modelName}.delete`);
      }
      if (st.op === "findOneAndDelete") {
        const doc = rt.fromRow(rows[0]);
        return wrap(rt, doc, st.lean);
      }
      return { deletedCount: rows.length, acknowledged: true };
    }
    case "updateOne":
    case "updateMany":
    case "findOneAndUpdate":
      return runUpdate(rt, st, cond);
  }
}

// ── updates ──────────────────────────────────────────────────────────────────

interface ParsedUpdate {
  set: AnyRec; // path -> value (already flattened per column later)
  unset: string[];
  inc: AnyRec;
  push: AnyRec;
  addToSet: AnyRec;
  pull: AnyRec;
  setOnInsert: AnyRec;
}

function parseUpdate(update: AnyRec): ParsedUpdate {
  const p: ParsedUpdate = { set: {}, unset: [], inc: {}, push: {}, addToSet: {}, pull: {}, setOnInsert: {} };
  const hasOps = Object.keys(update).some((k) => k.startsWith("$"));
  if (!hasOps) {
    p.set = { ...update };
    return p;
  }
  for (const [op, val] of Object.entries(update)) {
    switch (op) {
      case "$set":
        Object.assign(p.set, val);
        break;
      case "$unset":
        p.unset.push(...Object.keys(val as AnyRec));
        break;
      case "$inc":
        Object.assign(p.inc, val);
        break;
      case "$push":
        Object.assign(p.push, val);
        break;
      case "$addToSet":
        Object.assign(p.addToSet, val);
        break;
      case "$pull":
        Object.assign(p.pull, val);
        break;
      case "$setOnInsert":
        Object.assign(p.setOnInsert, val);
        break;
      case "$currentDate":
        for (const k of Object.keys(val as AnyRec)) p.set[k] = new Date();
        break;
      default:
        throw new Error(`Unsupported update operator ${op}`);
    }
  }
  return p;
}

function setRowFromPaths(rt: Runtime, set: AnyRec): AnyRec {
  // `set` keys may be dotted paths; rt.toRow understands both nested objects and dotted keys
  const row: AnyRec = {};
  for (const [path, v] of Object.entries(set)) {
    if (rt.isExtraPath(path)) continue;
    const col = rt.colOf(path);
    if (col && col !== "id") {
      row[col] = encode(rt.cols[col], v);
      continue;
    }
    const jc = rt.column(path);
    if (jc?.jsonPath) throw new Error(`Cannot $set into JSON sub-path ${rt.modelName}.${path}; set the whole field`);
    Object.assign(row, rt.toRow({ [path.split(".")[0]]: path.includes(".") ? nestFrom(path.split(".").slice(1), v) : v }));
  }
  return row;
}

function nestFrom(parts: string[], v: unknown): AnyRec {
  const out: AnyRec = {};
  setPath(out, parts.join("."), v);
  return out;
}

const eqKey = (v: unknown) => (isPlain(v) ? JSON.stringify(v) : String(toId(v) ?? v));

async function applyArrayOps(rt: Runtime, parentId: string, ops: ParsedUpdate, ownerHint?: AnyRec) {
  const db = getSupabaseAdmin();
  const items = (v: unknown): unknown[] => (isPlain(v) && Array.isArray((v as AnyRec).$each) ? ((v as AnyRec).$each as unknown[]) : [v]);

  for (const kind of ["push", "addToSet"] as const) {
    for (const [path, v] of Object.entries(ops[kind])) {
      const list = rt.cfg.lists?.[path];
      const child = rt.cfg.children?.[path];
      if (list) {
        const values = items(v).map((x) => toId(x)).filter(isUuid) as string[];
        await rt.replaceList(parentId, path, list, values, false, ownerHint);
      } else if (child) {
        const rows = items(v).map((i) => rt.childRow(child, parentId, i as AnyRec));
        const { error } = await db.from(child.table).insert(rows);
        if (error) throw toDbError(error, `${rt.modelName}.${path}`);
      } else {
        const col = rt.colOf(path);
        if (!col || !rt.cols[col].endsWith("[]") && rt.cols[col] !== "json") throw new Error(`$${kind} on non-array field ${rt.modelName}.${path}`);
        const { data, error } = await db.from(rt.table).select(col).eq("id", parentId).single();
        if (error) throw toDbError(error, `${rt.modelName}.${path}`);
        const cur: unknown[] = ((data as AnyRec)[col] as unknown[]) ?? [];
        const next = [...cur];
        for (const it of items(v)) {
          const enc = encode(rt.cols[col].replace("[]", "") as ColKind, it);
          if (kind === "addToSet" && next.some((x) => eqKey(x) === eqKey(enc))) continue;
          next.push(enc);
        }
        const { error: e2 } = await db.from(rt.table).update({ [col]: next }).eq("id", parentId);
        if (e2) throw toDbError(e2, `${rt.modelName}.${path}`);
      }
    }
  }

  for (const [path, cond] of Object.entries(ops.pull)) {
    const list = rt.cfg.lists?.[path];
    const child = rt.cfg.children?.[path];
    if (list) {
      const owner = await rt.ownerKeyValue(list, parentId, ownerHint);
      const values = (isPlain(cond) && Array.isArray(cond.$in) ? cond.$in : [cond]).map((x: unknown) => toId(x)).filter(isUuid);
      if (!values.length) continue;
      let del: any = db.from(list.table).delete().eq(list.ownerCol, owner).in(list.valueCol, values);
      for (const [c, v] of Object.entries(list.where ?? {})) del = del.eq(c, v);
      const { error } = await del;
      if (error) throw toDbError(error, `${rt.modelName}.${path}`);
    } else if (child) {
      let del: any = db.from(child.table).delete().eq(child.fk, parentId);
      if (isPlain(cond)) {
        for (const [f, v] of Object.entries(cond)) del = del.eq(child.fields?.[f] ?? snake(f), encode(DB_SCHEMA[child.table][child.fields?.[f] ?? snake(f)], v));
      }
      const { error } = await del;
      if (error) throw toDbError(error, `${rt.modelName}.${path}`);
    } else {
      const col = rt.colOf(path);
      if (!col) throw new Error(`$pull on unmapped field ${rt.modelName}.${path}`);
      const { data, error } = await db.from(rt.table).select(col).eq("id", parentId).single();
      if (error) throw toDbError(error, `${rt.modelName}.${path}`);
      const cur: unknown[] = ((data as AnyRec)[col] as unknown[]) ?? [];
      const drop = (isPlain(cond) && Array.isArray(cond.$in) ? cond.$in : [cond]).map(eqKey);
      const next = cur.filter((x) => !drop.includes(eqKey(x)));
      const { error: e2 } = await db.from(rt.table).update({ [col]: next }).eq("id", parentId);
      if (e2) throw toDbError(e2, `${rt.modelName}.${path}`);
    }
  }
}

async function applyUpdateToIds(rt: Runtime, ids: string[], ops: ParsedUpdate): Promise<AnyRec[]> {
  const db = getSupabaseAdmin();
  const row = setRowFromPaths(rt, ops.set);
  for (const path of ops.unset) {
    const list = rt.cfg.lists?.[path];
    const child = rt.cfg.children?.[path];
    if (list || child) {
      for (const id of ids) await rt.writeExtras(id, { [path]: [] }, "replace");
      continue;
    }
    const col = rt.colOf(path);
    if (col) row[col] = rt.cols[col].endsWith("[]") ? [] : null;
  }
  // set on list/children paths
  for (const [path, v] of Object.entries(ops.set)) {
    if (rt.isExtraPath(path)) for (const id of ids) await rt.writeExtras(id, { [path]: v }, "replace");
  }
  let rows: AnyRec[] = [];
  if (Object.keys(row).length) {
    for (const part of chunks(ids, BIG_IN)) {
      const { data, error } = await db.from(rt.table).update(row).in("id", part).select("*");
      if (error) throw toDbError(error, `${rt.modelName}.update`);
      rows.push(...(data as AnyRec[]));
    }
  }
  for (const [path, delta] of Object.entries(ops.inc)) {
    const col = rt.colOf(path);
    if (!col) throw new Error(`$inc on unmapped field ${rt.modelName}.${path}`);
    for (const id of ids) {
      const { error } = await db.rpc("dh_increment", { p_table: rt.table, p_id: id, p_column: col, p_delta: delta });
      if (error) throw toDbError(error, `${rt.modelName}.inc`);
    }
  }
  for (const id of ids) await applyArrayOps(rt, id, ops);
  return rows;
}

function insertDocFromFilter(filter: Filter): AnyRec {
  const out: AnyRec = {};
  for (const [k, v] of Object.entries(filter)) {
    if (k.startsWith("$")) continue;
    if (isPlain(v)) {
      if ("$eq" in v) setPath(out, k, v.$eq);
      continue;
    }
    setPath(out, k, v);
  }
  return out;
}

async function runUpdate(rt: Runtime, st: QueryState, cond: Cond): Promise<any> {
  const update = st.update ?? {};
  const ops = parseUpdate(update);
  const multi = st.op === "updateMany";
  const wantNew = st.opts.new === true || st.opts.returnDocument === "after";
  const upsert = !!st.opts.upsert;
  const needsBefore = st.op === "findOneAndUpdate" && !wantNew;

  const simple = multi && !upsert && !ops.unset.length && !Object.keys(ops.inc).length && !Object.keys(ops.push).length &&
    !Object.keys(ops.addToSet).length && !Object.keys(ops.pull).length && ![...Object.keys(ops.set)].some((p) => rt.isExtraPath(p));

  if (simple && cond.k !== "never") {
    const row = setRowFromPaths(rt, ops.set);
    if (!Object.keys(row).length) return { acknowledged: true, matchedCount: 0, modifiedCount: 0, upsertedCount: 0 };
    const big = findBigIn(cond, BIG_IN);
    const parts = big ? chunks(big.leaf.val as unknown[], BIG_IN).map((p) => replaceLeaf(cond, big.path, { ...big.leaf, val: p })) : [cond];
    let count = 0;
    for (const c of parts) {
      let b: any = getSupabaseAdmin().from(rt.table).update(row);
      b = applyCond(b, c);
      const { data, error } = await b.select("id");
      if (error) throw toDbError(error, `${rt.modelName}.updateMany`);
      count += (data as AnyRec[]).length;
    }
    return { acknowledged: true, matchedCount: count, modifiedCount: count, upsertedCount: 0 };
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    const rows = cond.k === "never" ? [] : await queryRows(rt, cond, { ...st, limit: multi ? undefined : 1 }, needsBefore ? "*" : "id");
    if (rows.length) {
      const ids = rows.map((r) => r.id as string);
      // Re-assert the filter on the write so concurrent claimers lose cleanly.
      const before = needsBefore ? await Promise.all(rows.map(async (r) => rt.fromRow(r))) : [];
      let updatedRows: AnyRec[];
      if (!multi && cond.k !== "always" && Object.keys(setRowFromPaths(rt, ops.set)).length && !ops.unset.length &&
          !Object.keys(ops.inc).length && !Object.keys(ops.push).length && !Object.keys(ops.addToSet).length && !Object.keys(ops.pull).length &&
          ![...Object.keys(ops.set)].some((p) => rt.isExtraPath(p))) {
        let b: any = getSupabaseAdmin().from(rt.table).update(setRowFromPaths(rt, ops.set)).eq("id", ids[0]);
        b = applyCond(b, cond);
        const { data, error } = await b.select("*");
        if (error) throw toDbError(error, `${rt.modelName}.update`);
        updatedRows = data as AnyRec[];
        if (!updatedRows.length) continue; // lost the race, re-select
      } else {
        updatedRows = await applyUpdateToIds(rt, ids, ops);
      }
      if (st.op !== "findOneAndUpdate") {
        return { acknowledged: true, matchedCount: ids.length, modifiedCount: ids.length, upsertedCount: 0 };
      }
      if (!wantNew) {
        const d = before[0];
        await rt.attachExtras([d], rt.projection(st.select).extras);
        if (st.populates.length) await populateDocs(rt, [d], st.populates);
        return wrap(rt, d, st.lean);
      }
      const touchedExtras = Object.keys(ops.inc).length + Object.keys(ops.push).length + Object.keys(ops.addToSet).length + Object.keys(ops.pull).length + ops.unset.length > 0;
      const finalRow = !touchedExtras && updatedRows[0] ? updatedRows[0] : await fetchOne(rt, ids[0]);
      const proj = rt.projection(st.select);
      const docs = await hydrateRows(rt, [finalRow], st, proj);
      return docs[0];
    }
    if (!upsert) {
      return st.op === "findOneAndUpdate" ? null : { acknowledged: true, matchedCount: 0, modifiedCount: 0, upsertedCount: 0 };
    }
    // upsert -> insert
    const base = insertDocFromFilter(st.filter);
    const data: AnyRec = { ...base };
    for (const [k, v] of Object.entries({ ...ops.setOnInsert, ...ops.set })) setPath(data, k, v);
    for (const [k, v] of Object.entries(ops.inc)) setPath(data, k, v);
    for (const [k, v] of Object.entries({ ...ops.push, ...ops.addToSet })) {
      setPath(data, k, isPlain(v) && Array.isArray(v.$each) ? v.$each : [v]);
    }
    try {
      const created = await insertOne(rt, data);
      if (st.op === "findOneAndUpdate") return wantNew ? wrap(rt, created, st.lean) : null;
      return { acknowledged: true, matchedCount: 0, modifiedCount: 0, upsertedCount: 1, upsertedId: created._id };
    } catch (err: any) {
      if (err?.code === 11000 && attempt < 2) continue; // someone inserted first: retry as update
      throw err;
    }
  }
  return st.op === "findOneAndUpdate" ? null : { acknowledged: true, matchedCount: 0, modifiedCount: 0, upsertedCount: 0 };
}

async function fetchOne(rt: Runtime, id: string): Promise<AnyRec> {
  const { data, error } = await getSupabaseAdmin().from(rt.table).select("*").eq("id", id).single();
  if (error) throw toDbError(error, `${rt.modelName}.fetch`);
  return data as AnyRec;
}


// ── aggregate (in-memory, Mongo-pipeline subset) ─────────────────────────────

/**
 * Supports the pipeline subset this app uses: leading `$match` (pushed to the
 * database), `$sort`, `$group` (`$sum`/`$avg`/`$min`/`$max`/`$first`/`$last`/
 * `$push`/`$addToSet`), `$limit`, `$skip`. Matching rows are fetched and
 * grouped here, so keep `$match` selective on large tables.
 */
function evalExpr(expr: any, doc: AnyRec): any {
  if (typeof expr === "string") {
    if (expr.startsWith("$")) {
      const v = getPath(doc, expr.slice(1));
      return v === undefined ? null : v;
    }
    return expr;
  }
  if (Array.isArray(expr)) return expr.map((e) => evalExpr(e, doc));
  if (expr instanceof Date || expr === null || typeof expr !== "object") return expr;
  const keys = Object.keys(expr);
  if (keys.length === 1 && keys[0].startsWith("$")) {
    const op = keys[0];
    const arg = (expr as AnyRec)[op];
    switch (op) {
      case "$ifNull": {
        const [a, b] = (arg as any[]).map((x) => evalExpr(x, doc));
        return a === null || a === undefined ? b : a;
      }
      case "$month":
        return new Date(evalExpr(arg, doc)).getUTCMonth() + 1;
      case "$year":
        return new Date(evalExpr(arg, doc)).getUTCFullYear();
      case "$dayOfMonth":
        return new Date(evalExpr(arg, doc)).getUTCDate();
      case "$toString": {
        const v = evalExpr(arg, doc);
        return v === null || v === undefined ? null : String(v);
      }
      default:
        throw new Error(`Unsupported aggregate expression ${op}`);
    }
  }
  const out: AnyRec = {};
  for (const [k, v] of Object.entries(expr)) out[k] = evalExpr(v, doc);
  return out;
}

function groupStage(docs: AnyRec[], spec: AnyRec): AnyRec[] {
  const { _id: idExpr, ...accs } = spec;
  const groups = new Map<string, { id: any; docs: AnyRec[] }>();
  for (const d of docs) {
    const id = idExpr === null || idExpr === undefined ? null : evalExpr(idExpr, d);
    const key = JSON.stringify(id);
    let g = groups.get(key);
    if (!g) groups.set(key, (g = { id, docs: [] }));
    g.docs.push(d);
  }
  const out: AnyRec[] = [];
  for (const g of groups.values()) {
    const row: AnyRec = { _id: g.id };
    for (const [field, acc] of Object.entries(accs)) {
      const [op, arg] = Object.entries(acc as AnyRec)[0];
      const vals = () => g.docs.map((d) => evalExpr(arg, d));
      const nums = () => vals().filter((v) => typeof v === "number" && Number.isFinite(v)) as number[];
      switch (op) {
        case "$sum":
          row[field] = typeof arg === "number" ? arg * g.docs.length : nums().reduce((a, b) => a + b, 0);
          break;
        case "$avg": {
          const n = nums();
          row[field] = n.length ? n.reduce((a, b) => a + b, 0) / n.length : null;
          break;
        }
        case "$min": {
          const n = vals().filter((v) => v !== null);
          row[field] = n.length ? n.reduce((a, b) => (b < a ? b : a)) : null;
          break;
        }
        case "$max": {
          const n = vals().filter((v) => v !== null);
          row[field] = n.length ? n.reduce((a, b) => (b > a ? b : a)) : null;
          break;
        }
        case "$first":
          row[field] = evalExpr(arg, g.docs[0]);
          break;
        case "$last":
          row[field] = evalExpr(arg, g.docs[g.docs.length - 1]);
          break;
        case "$push":
          row[field] = vals();
          break;
        case "$addToSet": {
          const seen = new Map<string, unknown>();
          for (const v of vals()) seen.set(JSON.stringify(v), v);
          row[field] = [...seen.values()];
          break;
        }
        default:
          throw new Error(`Unsupported $group accumulator ${op}`);
      }
    }
    out.push(row);
  }
  return out;
}

async function aggregateRt(rt: Runtime, pipeline: AnyRec[]): Promise<AnyRec[]> {
  let i = 0;
  const filters: Filter[] = [];
  while (i < pipeline.length && "$match" in pipeline[i]) filters.push(pipeline[i++].$match);
  const filter = filters.length > 1 ? { $and: filters } : filters[0] ?? {};
  let rows: AnyRec[] = await run(rt, {
    op: "find", filter, populates: [], lean: true, opts: {},
  });
  for (; i < pipeline.length; i++) {
    const stage = pipeline[i];
    const [op, arg] = Object.entries(stage)[0];
    switch (op) {
      case "$sort": {
        const cmp = sortComparator(rt, arg as SortSpec);
        if (cmp) rows = rows.slice().sort(cmp);
        break;
      }
      case "$group":
        rows = groupStage(rows, arg as AnyRec);
        break;
      case "$limit":
        rows = rows.slice(0, arg as number);
        break;
      case "$skip":
        rows = rows.slice(arg as number);
        break;
      default:
        throw new Error(`Unsupported aggregate stage ${op}`);
    }
  }
  return rows;
}

// ── public model ─────────────────────────────────────────────────────────────

export interface UpdateResult {
  acknowledged: boolean;
  matchedCount: number;
  modifiedCount: number;
  upsertedCount: number;
  upsertedId?: string;
}

export interface Document {
  _id: any;
  id: any;
  isNew?: boolean;
  save(): Promise<this>;
  toObject(opts?: any): any;
  toJSON(): any;
  get(path: string): any;
  set(path: string | Record<string, any>, value?: any): this;
  markModified(path?: string): void;
  isModified(path?: string): boolean;
  populate(path: any, select?: any): Promise<this>;
  deleteOne(): Promise<any>;
  remove(): Promise<any>;
}

export type FilterQuery<_T = any> = Filter;
export type UpdateQuery<_T = any> = AnyRec;

export interface ModelClass<T = any> {
  new (data?: AnyRec): T;
  readonly modelName: string;
  readonly tableName: string;
  find(filter?: Filter, projection?: any, options?: AnyRec): Query<T[]>;
  findOne(filter?: Filter, projection?: any, options?: AnyRec): Query<T | null>;
  findById(id: any, projection?: any, options?: AnyRec): Query<T | null>;
  create(doc: AnyRec, options?: any): Promise<T>;
  create(docs: AnyRec[], options?: any): Promise<T[]>;
  insertMany(docs: AnyRec[], options?: any): Promise<T[]>;
  updateOne(filter: Filter, update: AnyRec, options?: AnyRec): Query<UpdateResult>;
  updateMany(filter: Filter, update: AnyRec, options?: AnyRec): Query<UpdateResult>;
  findOneAndUpdate(filter: Filter, update: AnyRec, options?: AnyRec): Query<T | null>;
  findByIdAndUpdate(id: any, update: AnyRec, options?: AnyRec): Query<T | null>;
  findOneAndDelete(filter: Filter, options?: AnyRec): Query<T | null>;
  findByIdAndDelete(id: any, options?: AnyRec): Query<T | null>;
  deleteOne(filter: Filter): Query<{ deletedCount: number }>;
  deleteMany(filter?: Filter): Query<{ deletedCount: number }>;
  countDocuments(filter?: Filter): Query<number>;
  estimatedDocumentCount(): Query<number>;
  exists(filter: Filter): Query<{ _id: any } | null>;
  distinct(field: string, filter?: Filter): Query<any[]>;
  aggregate<R = any>(pipeline: AnyRec[]): Promise<R[]>;
}

export function defineModel<T = any>(cfg: ModelConfig): ModelClass<T> {
  const rt = new Runtime(cfg);

  const newQuery = (op: Op, filter: Filter | undefined, extra: Partial<QueryState> = {}) =>
    new Query<any>(rt, { op, filter: filter ?? {}, populates: [], lean: false, opts: {}, ...extra });

  const byId = (id: unknown): Filter => ({ _id: id });

  function Model(this: AnyRec, data: AnyRec = {}) {
    return makeDoc(rt, { ...data }, true);
  }

  const statics = {
    modelName: cfg.name,
    tableName: cfg.table,
    __rt: rt,
    find: (filter?: Filter, projection?: unknown, options: AnyRec = {}) =>
      newQuery("find", filter, { select: projection, sort: options.sort, limit: options.limit, skip: options.skip, lean: !!options.lean, opts: options }),
    findOne: (filter?: Filter, projection?: unknown, options: AnyRec = {}) =>
      newQuery("findOne", filter, { select: projection, sort: options.sort, lean: !!options.lean, opts: options }),
    findById: (id: unknown, projection?: unknown, options: AnyRec = {}) =>
      newQuery("findOne", byId(id), { select: projection, lean: !!options.lean, opts: options }),
    async create(docs: AnyRec | AnyRec[]) {
      const list = Array.isArray(docs) ? docs : [docs];
      const out: AnyRec[] = [];
      for (const d of list) {
        const created = await insertOne(rt, d instanceof Object && typeof (d as AnyRec).toObject === "function" ? (d as AnyRec).toObject() : d);
        out.push(makeDoc(rt, created, false));
      }
      return Array.isArray(docs) ? out : out[0];
    },
    async insertMany(docs: AnyRec[]) {
      return (statics.create as (d: AnyRec[]) => Promise<AnyRec[]>)(docs);
    },
    updateOne: (filter: Filter, update: AnyRec, options: AnyRec = {}) => newQuery("updateOne", filter, { update, opts: options }),
    updateMany: (filter: Filter, update: AnyRec, options: AnyRec = {}) => newQuery("updateMany", filter, { update, opts: options }),
    findOneAndUpdate: (filter: Filter, update: AnyRec, options: AnyRec = {}) =>
      newQuery("findOneAndUpdate", filter, { update, opts: options, sort: options.sort, select: options.projection ?? options.select, lean: !!options.lean }),
    findByIdAndUpdate: (id: unknown, update: AnyRec, options: AnyRec = {}) =>
      newQuery("findOneAndUpdate", byId(id), { update, opts: options, select: options.projection ?? options.select, lean: !!options.lean }),
    findOneAndDelete: (filter: Filter, options: AnyRec = {}) => newQuery("findOneAndDelete", filter, { opts: options, sort: options.sort }),
    findByIdAndDelete: (id: unknown, options: AnyRec = {}) => newQuery("findOneAndDelete", byId(id), { opts: options }),
    deleteOne: (filter: Filter) => newQuery("deleteOne", filter),
    deleteMany: (filter?: Filter) => newQuery("deleteMany", filter),
    countDocuments: (filter?: Filter) => newQuery("count", filter),
    estimatedDocumentCount: () => newQuery("count", {}),
    exists: (filter: Filter) => newQuery("exists", filter),
    distinct: (field: string, filter?: Filter) => newQuery("distinct", filter, { field }),
    aggregate: (pipeline: AnyRec[]) => aggregateRt(rt, pipeline),
  };
  Object.assign(Model, statics);
  return Model as unknown as ModelClass<T>;
}

export { toDbError };
