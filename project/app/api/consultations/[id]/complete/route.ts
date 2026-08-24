import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Consultation from "@/lib/models/Consultation";
import { Call } from "@/lib/models/Call";
import { getRequestUser } from "@/lib/auth/getRequestUser";
import { apiLogger } from "@/lib/apiLogger";
import { isMongoObjectId } from "@/lib/utils/mongoId";
import { finalizeCall } from "@/lib/consultations/finalizeSession";
import { apiError } from "@/lib/api/errors";

/**
 * The practitioner declares the consultation finished.
 *
 * Until now nothing ever said "this is done" — a consultation was closed out
 * by whoever happened to leave the room last, or by its window expiring, and
 * was recorded as completed either way. That answers "did the session stop?",
 * which is not the same question as "did the consultation happen?".
 *
 * Practitioner-only, deliberately. Ending a clinical encounter is a clinical
 * judgement, and it is the practitioner who writes the notes against it. A
 * patient closing their laptop is leaving, not concluding — which is why the
 * patient's side of this offers a rejoin instead.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const scope = "api/consultations/complete";
  try {
    const currentUser = await getRequestUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!isMongoObjectId(id)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await connectToDatabase();
    const consultation = await Consultation.findById(id);
    if (!consultation) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (String(consultation.practitionerId) !== currentUser.userId) {
      apiLogger.warn(scope, "forbidden", {
        consultationId: id,
        userId: currentUser.userId,
      });
      return NextResponse.json(
        { error: "Only the practitioner can end a consultation" },
        { status: 403 },
      );
    }

    const call = await Call.findOne({ consultationId: id, status: "active" });
    if (call) {
      call.endedBy = currentUser.userId as unknown as typeof call.endedBy;
      await call.save();
      // finalizeCall owns the billing and the status write, so the explicit
      // path and the automatic one cannot disagree about what happened.
      const { outcome } = await finalizeCall(scope, call, "practitioner_ended");
      apiLogger.info(scope, "completed_with_session", {
        consultationId: id,
        outcome,
      });
      return NextResponse.json({ success: true, status: outcome ?? "completed" });
    }

    // No live session left to close — the room had already emptied and been
    // finalised. Recording the practitioner's decision is still the point.
    if (consultation.status !== "completed") {
      consultation.status = "completed";
      await consultation.save();
    }
    apiLogger.info(scope, "completed_without_session", { consultationId: id });
    return NextResponse.json({ success: true, status: "completed" });
  } catch (error: unknown) {
    return apiError(error, "We could not complete this consultation. Please try again.");
  }
}
