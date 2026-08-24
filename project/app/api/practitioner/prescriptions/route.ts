import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Prescription, MedicalContext } from "@/lib/models/ClinicalData";
import Conversation from "@/lib/models/Conversation";
import Message from "@/lib/models/Message";
import { getRequestUser } from "@/lib/auth/getRequestUser";
import { durableUrl, uploadBuffer } from "@/lib/supabase/media";
import { Notification } from "@/lib/models/Communications";
import User from "@/lib/models/User";
import Ably from "ably";
import mongoose from "mongoose";

import { apiError } from "@/lib/api/errors";
async function publishChatMessage(channelName: string, event: string, data: unknown) {
  try {
    if (!process.env.ABLY_API_KEY) return;
    const ably = new Ably.Rest(process.env.ABLY_API_KEY);
    const channel = ably.channels.get(channelName);
    await channel.publish(event, data);
  } catch (err) {
    console.warn("[prescriptions] Ably publish failed:", err);
  }
}

/**
 * POST — issue a prescription (JSON or multipart with formal script file).
 * Notifies patient, posts chat message (with attachment if provided), updates meds list.
 */
export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const user = await getRequestUser();

    if (!user || (user.role !== "practitioner" && user.role !== "mega_admin")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const contentType = req.headers.get("content-type") || "";
    let patientId = "";
    let medicationName = "";
    let dosage = "";
    let instructions = "";
    let refillsRemaining = 0;
    let notifyChat = true;
    let file: File | null = null;

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      patientId = String(form.get("patientId") || "");
      medicationName = String(form.get("medicationName") || "");
      dosage = String(form.get("dosage") || "");
      instructions = String(form.get("instructions") || "");
      refillsRemaining = parseInt(String(form.get("refillsRemaining") || "0"), 10) || 0;
      notifyChat = form.get("notifyChat") !== "false";
      const f = form.get("file");
      if (f instanceof File && f.size > 0) file = f;
    } else {
      const body = await req.json();
      patientId = body.patientId;
      medicationName = body.medicationName;
      dosage = body.dosage || "";
      instructions = body.instructions || "";
      refillsRemaining = body.refillsRemaining || 0;
      notifyChat = body.notifyChat !== false;
    }

    if (!patientId || !medicationName) {
      return NextResponse.json(
        {
          success: false,
          error: "Patient ID and Medication Name are required",
        },
        { status: 400 },
      );
    }
    if (!mongoose.Types.ObjectId.isValid(patientId)) {
      return NextResponse.json(
        { success: false, error: "Invalid patient ID" },
        { status: 400 },
      );
    }

    let documentUrl: string | undefined;
    let documentMime: string | undefined;
    let documentName: string | undefined;
    let mediaId: string | undefined;

    if (file) {
      const buffer = Buffer.from(await file.arrayBuffer());
      try {
        const asset = await uploadBuffer({
          buffer,
          fileName: file.name || `${medicationName}-script.pdf`,
          mimeType: file.type || "application/pdf",
          userId: user.userId,
          purpose: "prescription",
          patientId,
          relatedType: "prescription",
        });
        documentUrl = durableUrl(asset);
        documentMime = file.type;
        documentName = file.name;
        mediaId = asset.id;
      } catch (err: any) {
        console.error("[prescriptions] Upload failed:", err);
        return apiError(err, "Could not upload prescription document. Check Supabase media config or try again.");
      }
    }

    const newPrescription = await Prescription.create({
      patientId,
      practitionerId: user.userId,
      medicationName,
      dosage,
      instructions,
      refillsRemaining,
      status: "active",
      prescribedDate: new Date(),
      documentUrl,
      documentMime,
      documentName,
      mediaId,
    });

    // Update medical context current meds
    const medicalContext = await MedicalContext.findOne({ patientId });
    if (medicalContext) {
      if (!medicalContext.currentMedications.includes(medicationName)) {
        medicalContext.currentMedications.push(medicationName);
        await medicalContext.save();
      }
    } else {
      await MedicalContext.create({
        patientId,
        currentMedications: [medicationName],
        chronicConditions: [],
        allergies: [],
        familyHistory: [],
      });
    }

    // Ensure 1:1 conversation exists and post a message at the top of the thread
    let conversationId: string | null = null;
    let messagePayload: any = null;

    if (notifyChat) {
      let conv = await Conversation.findOne({
        patientId,
        practitionerId: user.userId,
        $or: [
          { consultationId: { $exists: false } },
          { consultationId: null },
        ],
      });

      if (!conv) {
        conv = await Conversation.create({
          patientId,
          practitionerId: user.userId,
          status: "active",
          minutesAllocated: 600,
        });
      }

      conversationId = conv._id.toString();
      const content = documentUrl
        ? `📋 New prescription: ${medicationName}${dosage ? ` (${dosage})` : ""}. Formal script attached for the pharmacy.`
        : `📋 New prescription: ${medicationName}${dosage ? ` — ${dosage}` : ""}.${instructions ? ` ${instructions}` : ""}`;

      const message = await Message.create({
        conversationId: conv._id,
        senderId: user.userId,
        receiverId: patientId,
        type: documentUrl ? "file" : "text",
        content,
        fileUrl: documentUrl,
        fileMime: documentMime,
        deliveredAt: new Date(),
        isRead: false,
      });

      conv.lastActivityAt = new Date();
      await conv.save();

      await Prescription.updateOne(
        { _id: newPrescription._id },
        {
          $set: {
            conversationId: conv._id,
            messageId: message._id,
          },
        },
      );

      messagePayload = {
        _id: message._id.toString(),
        conversationId: conv._id.toString(),
        senderId: user.userId,
        receiverId: patientId,
        type: message.type,
        content: message.content,
        fileUrl: documentUrl,
        fileMime: documentMime,
        createdAt: message.createdAt,
        isRead: false,
      };

      await publishChatMessage(
        `conversation:${conversationId}`,
        "new:message",
        messagePayload,
      );
    }

    // In-app notification so patient gets a clear ping
    const doctor = await User.findById(user.userId)
      .select("firstName lastName")
      .lean();
    const doctorName = doctor
      ? `Dr. ${(doctor as any).firstName} ${(doctor as any).lastName}`
      : "Your doctor";

    try {
      await Notification.create({
        userId: new mongoose.Types.ObjectId(patientId),
        type: "prescription_issued",
        title: "New prescription issued",
        body: `${doctorName} issued a prescription for ${medicationName}. Open Messages or Health Records → Meds to view${documentUrl ? " and download the script" : ""}.`,
        data: {
          prescriptionId: newPrescription._id.toString(),
          patientId,
          conversationId,
          documentUrl: documentUrl || null,
          medicationName,
        },
        isRead: false,
        deliveredVia: ["in_app"],
      });
    } catch (err) {
      console.warn("[prescriptions] notification failed:", err);
    }

    return NextResponse.json({
      success: true,
      data: {
        ...newPrescription.toObject(),
        id: newPrescription._id.toString(),
        documentUrl,
        conversationId,
        message: messagePayload,
      },
    });
  } catch (err: any) {
    console.error("[POST /api/practitioner/prescriptions]", err);
    return apiError(err);
  }
}

/** GET — list prescriptions issued by this practitioner (optional patientId filter) */
export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const user = await getRequestUser();
    if (!user || (user.role !== "practitioner" && user.role !== "mega_admin")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const patientId = new URL(req.url).searchParams.get("patientId");
    const filter: any = { practitionerId: user.userId };
    if (patientId && mongoose.Types.ObjectId.isValid(patientId)) {
      filter.patientId = patientId;
    }
    const list = await Prescription.find(filter)
      .sort({ prescribedDate: -1 })
      .limit(100)
      .lean();
    return NextResponse.json({
      success: true,
      data: list.map((p: any) => ({
        id: p._id.toString(),
        ...p,
        _id: undefined,
      })),
    });
  } catch (err: any) {
    return apiError(err);
  }
}
