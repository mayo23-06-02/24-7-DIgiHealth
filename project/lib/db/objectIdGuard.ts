import mongoose from "mongoose";
import { isMongoObjectId } from "@/lib/utils/mongoId";

/**
 * Global Mongoose guard against Postgres uuids reaching ObjectId-typed query
 * paths.
 *
 * Background: the Mongo→Postgres migration left `getRequestUser().userId` as
 * EITHER a Mongo ObjectId string (accounts with a `mongo_id`) or a Postgres
 * uuid (accounts without one — see lib/auth/getRequestUser.ts). Mongoose
 * validates a filter against the schema before it runs, so a uuid landing on
 * an ObjectId path throws a CastError and the route 500s — it never even
 * reaches the database.
 *
 * That was being patched per-route with `isMongoObjectId()` guards, but ~60
 * routes call `getRequestUser()` without one, so each newly-exercised screen
 * surfaced the same crash (the practitioner dashboard, queue and patient list
 * were all down in production because of it).
 *
 * This fixes the whole class centrally instead. On READ queries, any
 * ObjectId-typed path whose value can never be cast is rewritten so the query
 * matches nothing, and a warning is logged. That is semantically correct, not
 * merely defensive: nothing stored in Mongo can reference an id that was never
 * a Mongo `_id`, so the honest answer for such a filter really is "no rows".
 *
 * Deliberately NOT applied to writes. A create/update carrying an uncastable
 * id is a genuine bug, and silently turning it into a no-op would hide data
 * loss — those should keep throwing loudly.
 */

/**
 * Read-only operations — see the note above about why writes are excluded.
 * Anchored so `find` does not also match `findOneAndUpdate`/`findOneAndDelete`.
 */
const GUARDED_OPS =
  /^(find|findOne|countDocuments|estimatedDocumentCount|distinct|exists)$/;

/** A filter that is valid, cheap, and can never match a real document. */
const MATCH_NOTHING = { _id: { $in: [] as unknown[] } };

function isCastable(value: unknown): boolean {
  if (value === null || value === undefined) return true; // null checks are legitimate
  if (value instanceof mongoose.Types.ObjectId) return true;
  if (typeof value === "string") return isMongoObjectId(value);
  return true; // anything else (dates, numbers, unknown shapes) — leave alone
}

/**
 * Returns true when this filter can never be cast successfully, so the caller
 * should short-circuit. Walks $and/$or/$nor branches as well as top-level keys.
 */
function filterIsUncastable(
  filter: Record<string, any> | undefined,
  schema: mongoose.Schema,
  depth = 0,
): boolean {
  if (!filter || typeof filter !== "object" || depth > 4) return false;

  for (const [key, value] of Object.entries(filter)) {
    // Logical branches: $or/$nor only fail if EVERY branch fails, $and if ANY does.
    if (key === "$and") {
      if (Array.isArray(value) && value.some((b) => filterIsUncastable(b, schema, depth + 1))) {
        return true;
      }
      continue;
    }
    if (key === "$or" || key === "$nor") {
      if (
        Array.isArray(value) &&
        value.length > 0 &&
        value.every((b) => filterIsUncastable(b, schema, depth + 1))
      ) {
        return true;
      }
      continue;
    }
    if (key.startsWith("$")) continue;

    const path = schema.path(key);
    if (!path || path.instance !== "ObjectId") continue;

    if (value && typeof value === "object" && !(value instanceof mongoose.Types.ObjectId)) {
      // Operator object: { $in: [...] }, { $ne: x }, { $exists: true }, ...
      for (const [op, opValue] of Object.entries(value as Record<string, unknown>)) {
        if (op === "$in" || op === "$nin") {
          if (Array.isArray(opValue) && opValue.length > 0 && opValue.every((v) => !isCastable(v))) {
            return true;
          }
        } else if (op === "$eq" || op === "$ne") {
          if (!isCastable(opValue)) return true;
        }
      }
      continue;
    }

    if (!isCastable(value)) return true;
  }

  return false;
}

/** Marks a schema as already guarded so repeat sweeps don't stack hooks. */
const GUARDED = Symbol.for("digihealth.objectIdGuard");

function applyGuardToSchema(schema: mongoose.Schema): void {
  if ((schema as any)[GUARDED]) return;
  (schema as any)[GUARDED] = true;

  schema.pre(GUARDED_OPS, function (this: mongoose.Query<any, any>) {
    try {
      const filter = this.getFilter();
      if (!filterIsUncastable(filter, schema, 0)) return;

      console.warn(
        `[objectIdGuard] Short-circuited ${this.model?.modelName ?? "query"}: ` +
          `filter references an id that is not a Mongo ObjectId. ` +
          `Returning an empty result instead of throwing a CastError. ` +
          `Filter: ${JSON.stringify(filter).slice(0, 200)}`,
      );

      this.setQuery(MATCH_NOTHING);
    } catch {
      // The guard must never be the reason a query fails — fall through and
      // let Mongoose behave exactly as it would have without it.
    }
  });
}

let pluginRegistered = false;

/**
 * Idempotent — safe (and intended) to call on every connection attempt.
 *
 * Runs in two parts because a Mongoose global plugin only reaches schemas
 * compiled AFTER it is registered, and import order varies per route file
 * (some import their models before `@/lib/mongodb`, some after). The global
 * plugin covers everything compiled later; the sweep over `mongoose.models`
 * covers anything already compiled. Together they are order-independent.
 */
export function installObjectIdGuard(): void {
  if (!pluginRegistered) {
    pluginRegistered = true;
    mongoose.plugin(applyGuardToSchema);
  }

  for (const model of Object.values(mongoose.models)) {
    if (model?.schema) applyGuardToSchema(model.schema);
  }
}
