import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { getRequestUser } from "@/lib/auth/getRequestUser";
import RiskScore from "@/lib/models/RiskScore";
import { Consultation } from "@/lib/models/Consultation";
import {
  clampRiskScore,
  riskBandFromScore,
  legacyRiskColor,
} from "@/lib/riskScore";

import { apiError } from "@/lib/api/errors";
/**
 * GET latest risk score for a patient (as assessed by this practitioner or overall latest)
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await connectToDatabase();
    const user = await getRequestUser();
    if (!user || (user.role !== "practitioner" && user.role !== "mega_admin")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const { id: patientId } = await params;
    if (!mongoose.Types.ObjectId.isValid(patientId)) {
      return NextResponse.json({ success: false, error: "Invalid patient id" }, { status: 400 });
    }

    const latest = await RiskScore.findOne({ patientId })
      .sort({ calculatedAt: -1 })
      .lean();

    if (latest) {
      return NextResponse.json({
        success: true,
        data: {
          score: latest.score,
          color: latest.color || riskBandFromScore(latest.score),
          factors: latest.factors || [],
          calculatedAt: latest.calculatedAt,
          notes: (latest as any).notes,
        },
      });
    }

    // Fallback: latest consultation clinical risk
    const consult = await Consultation.findOne({
      patientId,
      "clinicalRisk.score": { $exists: true },
    })
      .sort({ scheduledStartTime: -1 })
      .select("clinicalRisk")
      .lean();

    const score = consult?.clinicalRisk?.score ?? 0;
    return NextResponse.json({
      success: true,
      data: {
        score,
        color: riskBandFromScore(score),
        factors: consult?.clinicalRisk?.factors || [],
        calculatedAt: null,
      },
    });
  } catch (err: any) {
    return apiError(err);
  }
}

/**
 * PUT — doctor sets / updates patient risk score (slider)
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await connectToDatabase();
    const user = await getRequestUser();
    if (!user || (user.role !== "practitioner" && user.role !== "mega_admin")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const { id: patientId } = await params;
    if (!mongoose.Types.ObjectId.isValid(patientId)) {
      return NextResponse.json({ success: false, error: "Invalid patient id" }, { status: 400 });
    }

    const body = await req.json();
    const score = clampRiskScore(Number(body.score));
    const band = riskBandFromScore(score);
    const factors = Array.isArray(body.factors) ? body.factors : [];
    const notes = typeof body.notes === "string" ? body.notes : undefined;

    const record = await RiskScore.create({
      patientId,
      practitionerId: user.userId,
      score,
      color: band,
      factors,
      notes,
      calculatedAt: new Date(),
    });

    // Mirror onto most recent open consult if any (legacy 3-colour enum)
    const openConsult = await Consultation.findOne({
      patientId,
      practitionerId: user.userId,
      status: { $in: ["scheduled", "in_progress", "pending", "requested"] },
    })
      .sort({ scheduledStartTime: -1 })
      .select("_id");
    if (openConsult) {
      await Consultation.updateOne(
        { _id: openConsult._id },
        {
          $set: {
            clinicalRisk: {
              score,
              color: legacyRiskColor(score),
              factors,
            },
          },
        },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: record._id.toString(),
        score: record.score,
        color: band,
        factors: record.factors,
        calculatedAt: record.calculatedAt,
        notes: record.notes,
      },
    });
  } catch (err: any) {
    console.error("[PUT risk]", err);
    return apiError(err);
  }
}
