import { camel } from "./naming";

export interface PgError {
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
}

/**
 * Convert a PostgREST/Postgres error into an Error that older route code
 * (written against Mongoose) can still branch on:
 *  - unique violation  -> `code === 11000`, `keyPattern`, `name === "MongoServerError"`
 *  - not-null / check / enum / fk / bad input -> `name === "ValidationError"`
 */
export function toDbError(error: PgError, context: string): Error {
  const err = new Error(`${context}: ${error.message ?? "database error"}`) as Error & Record<string, unknown>;
  err.pgCode = error.code;
  err.details = error.details ?? undefined;
  switch (error.code) {
    case "23505": {
      err.name = "MongoServerError";
      err.code = 11000;
      const m = /Key \(([^)]+)\)=\(([^)]*)\)/.exec(error.details ?? "");
      if (m) {
        err.keyPattern = Object.fromEntries(m[1].split(/,\s*/).map((c) => [camel(c.replace(/^lower\((.*)\)$/, "$1")), 1]));
        err.keyValue = Object.fromEntries(m[1].split(/,\s*/).map((c, i) => [camel(c), m[2].split(/,\s*/)[i]]));
      } else {
        err.keyPattern = {};
        err.keyValue = {};
      }
      err.message = `E11000 duplicate key error: ${error.message}`;
      break;
    }
    case "23502":
    case "23503":
    case "23514":
    case "22P02":
    case "22001":
    case "22003":
    case "22007":
      err.name = "ValidationError";
      err.errors = {};
      break;
    default:
      err.code = error.code;
  }
  return err;
}

export function isDuplicateKeyError(err: unknown): boolean {
  return !!err && typeof err === "object" && (err as { code?: unknown }).code === 11000;
}
