import { NextResponse } from "next/server";

/**
 * The reference clock for anything time-gated on the client.
 *
 * Deliberately tiny and unauthenticated: it discloses nothing but the current
 * time, and it has to be reachable before a page knows which session it is
 * rendering. `no-store` matters more than it looks — a cached timestamp is a
 * wrong timestamp, which is the exact failure this endpoint exists to prevent.
 */
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    { now: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
