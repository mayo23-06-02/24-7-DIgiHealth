import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { expireStaleBookingRequests } from "@/lib/booking/expire";

/**
 * POST /api/bookings/expire
 * Manually (or via cron) cancel unaccepted requests past their start time.
 */
export async function POST() {
  try {
    await connectToDatabase();
    const result = await expireStaleBookingRequests({ limit: 500, notify: true });
    return NextResponse.json({ success: true, ...result });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Expire failed",
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  return POST();
}
