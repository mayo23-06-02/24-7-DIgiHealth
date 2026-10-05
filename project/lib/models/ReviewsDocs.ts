import { defineModel, type Document, type ModelClass } from '@/lib/db';
export interface IReview extends Document {
  consultationId: string;
  patientId: string;
  practitionerId: string;
  rating: number;
  comment: string;
  categories: any;
  isVerified: boolean;
}

export interface IMedicalDocument extends Document {
  userId: string;
  uploadedBy: string;
  type: string;
  /** Durable media proxy URL or legacy CDN URL */
  cloudinaryUrl: string;
  publicId: string;
  mediaId?: string;
  mimeType: string;
  status: string;
  verifiedAt?: Date;
  /** Free-text note/caption attached by the patient or a practitioner */
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const Review: ModelClass<IReview> = defineModel<IReview>({
  name: 'Review', table: 'reviews',
  refs: { consultationId: 'Consultation', patientId: 'User', practitionerId: 'User' },
});
export const MedicalDocument: ModelClass<IMedicalDocument> = defineModel<IMedicalDocument>({
  name: 'MedicalDocument', table: 'medical_documents',
  columns: { cloudinaryUrl: 'file_url' },
  refs: { userId: 'User', uploadedBy: 'User' },
});
