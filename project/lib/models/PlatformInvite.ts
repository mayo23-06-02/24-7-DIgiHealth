import mongoose, { Schema, Document, Model, Types } from "mongoose";

/**
 * An invite issued by a platform admin (mega_admin/super_admin) via User
 * Management, for a role that still completes its own profile through the
 * normal registration wizard (patient, practitioner, hospital_admin) —
 * distinct from StaffInvite, which is a hospital admin inviting a doctor to
 * their specific facility's roster.
 *
 * super_admin/mega_admin invites never create one of these: those accounts
 * are created in full immediately (see /api/admin/users/invite), since
 * there's no wizard for them to complete.
 */
export interface IPlatformInvite extends Document {
  email: string;
  role: "patient" | "practitioner" | "hospital_admin";
  invitedBy: Types.ObjectId;
  token: string;
  status: "pending" | "accepted" | "cancelled" | "expired";
  expiresAt: Date;
  acceptedAt?: Date;
}

const PlatformInviteSchema = new Schema<IPlatformInvite>(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    role: { type: String, enum: ["patient", "practitioner", "hospital_admin"], required: true },
    invitedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    token: { type: String, required: true, unique: true },
    status: { type: String, enum: ["pending", "accepted", "cancelled", "expired"], default: "pending" },
    expiresAt: { type: Date, required: true },
    acceptedAt: { type: Date },
  },
  { timestamps: true },
);

const PlatformInvite: Model<IPlatformInvite> =
  mongoose.models.PlatformInvite ||
  mongoose.model<IPlatformInvite>("PlatformInvite", PlatformInviteSchema);

export default PlatformInvite;
