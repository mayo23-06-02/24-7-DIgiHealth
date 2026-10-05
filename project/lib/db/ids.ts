import { randomUUID } from "node:crypto";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** True when `value` is a canonical Postgres uuid string. */
export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

/** Alias kept for call sites that used mongoose's `isValidObjectId`. */
export const isValidId = isUuid;

/**
 * Normalise anything id-like (string, `{ id }`, `{ _id }`, `{ toString() }`)
 * to its string id. Returns undefined for null/undefined.
 */
export function toId(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    const v = value as { id?: unknown; _id?: unknown };
    if (v._id !== undefined && v._id !== null) return String(v._id);
    if (v.id !== undefined && v.id !== null) return String(v.id);
  }
  return String(value);
}

/** True when two id-likes refer to the same row. */
export function sameId(a: unknown, b: unknown): boolean {
  const x = toId(a);
  const y = toId(b);
  return x !== undefined && y !== undefined && x.toLowerCase() === y.toLowerCase();
}

export function newId(): string {
  return randomUUID();
}
