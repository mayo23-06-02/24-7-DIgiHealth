import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { sendDueAppointmentReminders, sendDueMessageReminders } from "@/lib/email/reminders";

/**
 * Always-on backstop for the two reminder jobs. The opportunistic checks
 * wired into /api/patient|practitioner/appointments and /api/notifications
 * only run while someone is actively polling the app — if nobody has it
 * open, those never fire. This route exists so a scheduler (Vercel Cron,
 * see vercel.json) can trigger the same checks unconditionally on a fixed
 * interval, regardless of live traffic.
 *
 * Protected via CRON_SECRET: Vercel automatically sends
 * `Authorization: Bearer $CRON_SECRET` for scheduled invocations once that
 * env var is set on the project — see https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    await connectToDatabase();

    const [appointments, messages] = await Promise.all([
      sendDueAppointmentReminders({ force: true }),
      sendDueMessageReminders({ force: true }),
    ]);

    return NextResponse.json({
      success: true,
      appointmentRemindersSent: appointments.sent,
      messageRemindersSent: messages.sent,
    });
  } catch (err: any) {
    console.error("[cron/reminders] error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
