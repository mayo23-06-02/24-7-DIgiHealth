import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IReview extends Document {
  consultationId: Types.ObjectId;
  patientId: Types.ObjectId;
  practitionerId: Types.ObjectId;
  rating: number;
  comment: string;
  categories: any;
  isVerified: boolean;
}

const ReviewSchema = new Schema<IReview>({
  consultationId: { type: Schema.Types.ObjectId, ref: 'Consultation' },
  patientId: { type: Schema.Types.ObjectId, ref: 'User' },
  practitionerId: { type: Schema.Types.ObjectId, ref: 'User' },
  rating: Number,
  comment: String,
  categories: Schema.Types.Mixed,
  isVerified: Boolean
}, { timestamps: true });

export interface IMedicalDocument extends Document {
  userId: Types.ObjectId;
  uploadedBy: Types.ObjectId;
  type: string;
  /** Durable media proxy URL or legacy CDN URL */
  cloudinaryUrl: string;
  publicId: string;
  mediaId?: string;
  mimeType: string;
  status: string;
  verifiedAt?: Date;
}

const MedicalDocumentSchema = new Schema<IMedicalDocument>({
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  type: String,
  cloudinaryUrl: String,
  publicId: String,
  mediaId: String,
  mimeType: String,
  status: String,
  verifiedAt: Date
}, { timestamps: true });

export const Review = mongoose.models.Review || mongoose.model<IReview>('Review', ReviewSchema);
export const MedicalDocument = mongoose.models.MedicalDocument || mongoose.model<IMedicalDocument>('MedicalDocument', MedicalDocumentSchema);