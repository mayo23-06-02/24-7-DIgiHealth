import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import AttachedRecord from "@/lib/models/AttachedRecord";
import Conversation from "@/lib/models/Conversation";
import Message from "@/lib/models/Message";
import { Prescription } from "@/lib/models/ClinicalData";
import { durableUrl, uploadBuffer } from "@/lib/supabase/media";
import { Notification } from "@/lib/models/Communications";
import User from "@/lib/models/User";
import Ably from "ably";
import mongoose from "mongoose";

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();

    const formData = await req.formData();
    const conversationId = formData.get("conversationId") as string;
    const type = (formData.get("type") as string) || "other";
    const title = formData.get("title") as string;
    const description = (formData.get("description") as string) || "";
    const file = formData.get("file") as File | null;
    const practitionerId = req.headers.get("x-user-id");

    if (!conversationId || !type || !title || !file || !practitionerId) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 },
      );
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return NextResponse.json(
        { success: false, error: "Conversation not found" },
        { status: 404 },
      );
    }

    const patientId = conversation.patientId;

    const buffer = Buffer.from(await file.arrayBuffer());
    let fileUrl = "";
    let mediaId: string | undefined;
    try {
      const asset = await uploadBuffer({
        buffer,
        fileName: file.name || title || "clinical-record",
        mimeType: file.type || "application/octet-stream",
        userId: String(practitionerId),
        purpose: type === "prescription" ? "prescription" : "chat",
        conversationId,
        patientId: patientId?.toString?.() || String(patientId),
        relatedType: type,
      });
      fileUrl = durableUrl(asset);
      mediaId = asset.id;
    } catch (err: any) {
      console.error("Media upload failed", err);
      return NextResponse.json(
        {
          success: false,
          error: err.message || "File upload failed. Please try again.",
        },
        { status: 500 },
      );
    }

    const record = await AttachedRecord.create({
      conversationId,
      consultationId: conversation.consultationId,
      patientId,
      practitionerId,
      type: type as any,
      title,
      description,
      fileUrl,
      fileMime: file.type,
      fileSize: file.size,
      mediaId,
      isRead: false,
    });

    // Message must carry fileUrl so patient can download in chat
    const content =
      type === "prescription"
        ? `📋 Prescription script: ${title}${description ? ` — ${description}` : ""}`
        : `Attached ${type.replace(/_/g, " ")}: ${title}`;

    const message = await Message.create({
      conversationId: conversation._id,
      senderId: practitionerId,
      receiverId: patientId,
      type: "record_attachment",
      recordId: record._id,
      content,
      fileUrl,
      fileMime: file.type,
      deliveredAt: new Date(),
      isRead: false,
    });

    // Bump conversation so it sorts as latest
    conversation.lastActivityAt = new Date();
    await conversation.save();

    // If type is prescription, also create/update a Prescription row for Meds tab
    if (type === "prescription") {
      try {
        await Prescription.create({
          patientId,
          practitionerId,
          medicationName: title,
          dosage: description || "See attached script",
          instructions: description || "Take as directed — see formal script",
          status: "active",
          prescribedDate: new Date(),
          refillsRemaining: 0,
          documentUrl: fileUrl,
          documentMime: file.type,
          documentName: file.name,
          mediaId,
          conversationId: conversation._id,
          messageId: message._id,
        });
      } catch (err) {
        console.warn("[attach-record] prescription row create failed:", err);
      }
    }

    const payload = {
      _id: message._id.toString(),
      conversationId: conversation._id.toString(),
      senderId: String(practitionerId),
      receiverId: patientId?.toString?.() || String(patientId),
      type: "record_attachment",
      content,
      fileUrl,
      fileMime: file.type,
      recordId: record._id.toString(),
      createdAt: message.createdAt,
      isRead: false,
    };

    // Realtime fan-out so patient sees it immediately as newest message
    try {
      if (process.env.ABLY_API_KEY) {
        const ably = new Ably.Rest(process.env.ABLY_API_KEY);
        const channel = ably.channels.get(`conversation:${conversationId}`);
        await channel.publish("new:message", payload);
      }
    } catch (err) {
      console.warn("[attach-record] Ably publish failed:", err);
    }

    // Notify patient
    try {
      const doctor = await User.findById(practitionerId)
        .select("firstName lastName")
        .lean();
      const doctorName = doctor
        ? `Dr. ${(doctor as any).firstName} ${(doctor as any).lastName}`
        : "Your doctor";
      await Notification.create({
        userId: patientId,
        type:
          type === "prescription"
            ? "prescription_issued"
            : "clinical_record_attached",
        title:
          type === "prescription"
            ? "New prescription script"
            : "New clinical attachment",
        body:
          type === "prescription"
            ? `${doctorName} sent a prescription script: ${title}. Open Messages to download it, or find it under Health Records → Meds.`
            : `${doctorName} attached a clinical record: ${title}. Open Messages to view.`,
        data: {
          conversationId: conversation._id.toString(),
          messageId: message._id.toString(),
          recordId: record._id.toString(),
          fileUrl,
          type,
        },
        isRead: false,
        deliveredVia: ["in_app"],
      });
    } catch (err) {
      console.warn("[attach-record] notification failed:", err);
    }

    return NextResponse.json({
      success: true,
      record,
      message: payload,
    });
  } catch (error: any) {
    console.error("[POST /api/chat/attach-record]", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
