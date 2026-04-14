import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IBodyAnnotation extends Document {
  patientId: Types.ObjectId;
  description: string;
  part: string;
  point: { x: number; y: number; z: number };
  createdAt: Date;
  updatedAt: Date;
}

const BodyAnnotationSchema = new Schema<IBodyAnnotation>(
  {
    patientId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    description: { type: String, required: true },
    part: { type: String, default: 'Surface Mapping' },
    point: {
      x: { type: Number, required: true },
      y: { type: Number, required: true },
      z: { type: Number, required: true },
    },
  },
  { timestamps: true }
);

export const BodyAnnotation =
  mongoose.models.BodyAnnotation ||
  mongoose.model<IBodyAnnotation>('BodyAnnotation', BodyAnnotationSchema);

export default BodyAnnotation;
