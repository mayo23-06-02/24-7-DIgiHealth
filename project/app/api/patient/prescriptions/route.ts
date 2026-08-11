import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Prescription } from "@/lib/models/ClinicalData";
import { getRequestUser } from "@/lib/auth/getRequestUser";

/** GET — patient's prescriptions (with downloadable script URL when available) */
export async function GET() {
  try {
    await connectToDatabase();
    const user = await getRequestUser();
    if (!user || user.role !== "patient") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const list = await Prescription.find({ patientId: user.userId })
      .sort({ prescribedDate: -1 })
      .lean();

    return NextResponse.json(
      list.map((p: any) => ({
        id: p._id.toString(),
        medicationName: p.medicationName,
        dosage: p.dosage,
        instructions: p.instructions,
        status: p.status,
        prescribedDate: p.prescribedDate,
        refillsRemaining: p.refillsRemaining,
        documentUrl: p.documentUrl || null,
        documentName: p.documentName || null,
        documentMime: p.documentMime || null,
        canDownload: !!p.documentUrl,
      })),
    );
  } catch (err: any) {
    console.error("[GET /api/patient/prescriptions]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/** POST — request a prescription refill */
export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const user = await getRequestUser();
    if (!user || user.role !== "patient") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { prescriptionId } = await request.json();
    if (!prescriptionId) {
      return NextResponse.json({ error: "Prescription ID required" }, { status: 400 });
    }

    const prescription = await Prescription.findOne({
      _id: prescriptionId,
      patientId: user.userId,
    });

    if (!prescription) {
      return NextResponse.json({ error: "Prescription not found" }, { status: 404 });
    }

    if (prescription.refillsRemaining <= 0) {
      return NextResponse.json(
        { error: "No refills remaining for this prescription" },
        { status: 400 },
      );
    }

    prescription.refillsRemaining -= 1;
    await prescription.save();

    return NextResponse.json({
      success: true,
      message: `Refill request for ${prescription.medicationName} submitted successfully`,
      refillsRemaining: prescription.refillsRemaining,
    });
  } catch (err: any) {
    console.error("[POST /api/patient/prescriptions]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
