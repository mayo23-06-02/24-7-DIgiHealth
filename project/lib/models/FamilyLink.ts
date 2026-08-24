import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IFamilyLink extends Document {
  guardianId?: Types.ObjectId;
  guardianKey?: string;
  memberKey?: string;
  /** Unset until an email-invited adult actually accepts (they may not have
   * an account yet at invite time) — inviteEmail identifies them until then. */
  memberId?: Types.ObjectId;
  inviteEmail?: string;
  /** Name the guardian gave when sending the invite — shown for a pending
   * invite before the invitee has an account to pull a name from. */
  inviteName?: string;
  relationship: 'child' | 'spouse' | 'parent' | 'other';
  /** Guardian-controlled toggle — the only thing that gates medical-history access. */
  isMinor: boolean;
  status: 'pending' | 'active' | 'revoked';
  /** Which onboarding path created this link — child accounts skip consent, adults don't. */
  linkedVia: 'guardian_created' | 'email_invite';
  inviteToken?: string;
  inviteExpiresAt?: Date;
  acceptedAt?: Date;
  revokedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const FamilyLinkSchema = new Schema<IFamilyLink>(
  {
    // Not required: a Postgres-native guardian has a uuid, which cannot be
    // cast into an ObjectId field. Those rows carry guardianKey instead.
    guardianId: { type: Schema.Types.ObjectId, ref: 'User' },
    /** Guardian's session id as a plain string — works for uuid and ObjectId alike. */
    guardianKey: { type: String, index: true },
    /** Member's session id as a plain string, once the invite is accepted. */
    memberKey: { type: String, index: true },
    memberId: { type: Schema.Types.ObjectId, ref: 'User' },
    inviteEmail: { type: String, lowercase: true, trim: true },
    inviteName: { type: String, trim: true },
    relationship: { type: String, enum: ['child', 'spouse', 'parent', 'other'], required: true },
    isMinor: { type: Boolean, default: false },
    status: { type: String, enum: ['pending', 'active', 'revoked'], default: 'pending' },
    linkedVia: { type: String, enum: ['guardian_created', 'email_invite'], required: true },
    inviteToken: { type: String },
    inviteExpiresAt: { type: Date },
    acceptedAt: { type: Date },
    revokedAt: { type: Date },
  },
  { timestamps: true },
);

FamilyLinkSchema.index({ guardianId: 1, status: 1 });
FamilyLinkSchema.index({ memberId: 1, status: 1 }, { sparse: true });
FamilyLinkSchema.index(
  { guardianId: 1, memberId: 1 },
  { unique: true, partialFilterExpression: { memberId: { $exists: true, $ne: null } } },
);
FamilyLinkSchema.index({ guardianId: 1, inviteEmail: 1 }, { sparse: true });
FamilyLinkSchema.index({ inviteToken: 1 }, { unique: true, sparse: true });

export const FamilyLink: Model<IFamilyLink> =
  mongoose.models.FamilyLink || mongoose.model<IFamilyLink>('FamilyLink', FamilyLinkSchema);

let indexSynced = false;
export async function syncFamilyLinkIndexes() {
  if (indexSynced) return;
  try {
    const collection = FamilyLink.collection;
    const indexes = await collection.indexes();
    const badIndex = indexes.find((idx: any) => idx.name === 'guardianId_1_memberId_1');
    if (badIndex && !badIndex.partialFilterExpression) {
      await collection.dropIndex('guardianId_1_memberId_1');
    }
    await FamilyLink.syncIndexes();
    indexSynced = true;
  } catch {
    indexSynced = true;
  }
}

export default FamilyLink;
