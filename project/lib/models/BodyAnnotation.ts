import { defineModel, type Document, type ModelClass } from '@/lib/db';
export interface IBodyAnnotation extends Document {
  patientId: string;
  description: string;
  part: string;
  point: { x: number; y: number; z: number };
  createdAt: Date;
  updatedAt: Date;
}

export const BodyAnnotation: ModelClass<IBodyAnnotation> = defineModel<IBodyAnnotation>({
  name: 'BodyAnnotation', table: 'body_annotations',
  nest: { point: 'point_' },
  refs: { patientId: 'User' },
});
export default BodyAnnotation;
