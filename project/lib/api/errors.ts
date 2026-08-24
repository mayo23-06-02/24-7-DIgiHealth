import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

/**
 * An error whose message was written for the end user and is safe to send back
 * verbatim — validation failures, quota messages, and the like. Anything that
 * is not one of these is treated as internal and replaced with generic copy.
 */
export class PublicError extends Error {
  readonly status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "PublicError";
    this.status = status;
  }
}

/**
 * Error classes defined elsewhere whose messages are also user-facing. Matched
 * by name rather than by `instanceof` so this module stays dependency-free and
 * can't create an import cycle with the modules that throw them.
 */
const SAFE_ERROR_NAMES = new Set(["PublicError", "MediaValidationError"]);

const GENERIC = "Something went wrong. Please try again.";

/**
 * Build the error response for a caught exception.
 *
 * Returning `err.message` straight to the client — which 110 of 170 route
 * handlers used to do — discloses whatever the throwing layer happened to say.
 * In practice that meant the ORM in use, internal model and field names, and
 * the caller's own account id, all readable by anyone who could provoke a 500.
 *
 * The full error is logged server-side against a short reference that is also
 * returned to the caller, so a user can quote it in a support ticket and it can
 * be found in the logs without exposing anything.
 */
export function apiError(
  err: unknown,
  fallback: string = GENERIC,
  status: number = 500,
): NextResponse {
  const ref = randomUUID().slice(0, 8);
  console.error(`[api-error ${ref}]`, err);

  const e = err as { name?: string; status?: number; message?: string } | null;
  if (e?.name && SAFE_ERROR_NAMES.has(e.name) && e.message) {
    return NextResponse.json(
      { success: false, error: e.message, ref },
      { status: typeof e.status === "number" ? e.status : 400 },
    );
  }

  // `success: false` is always included: roughly two thirds of the call sites
  // this replaced already returned it and their clients branch on it, and the
  // rest simply ignore the extra key.
  return NextResponse.json({ success: false, error: fallback, ref }, { status });
}
