import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IPractitionerSchedule extends Document {
  practitionerId: Types.ObjectId;
  date: Date;
  slots: { startTime: string; endTime: string; status: string }[];
  recurring?: { dayOfWeek: number; startHour: number; endHour: number };
}
const PractitionerScheduleSchema = new Schema<IPractitionerSchedule>({
  practitionerId: { type: Schema.Types.ObjectId, ref: 'User' },
  date: Date,
  slots: [{ startTime: String, endTime: String, status: String }],
  recurring: { dayOfWeek: Number, startHour: Number, endHour: Number }
}, { timestamps: true });

export const PractitionerSchedule = mongoose.models.PractitionerSchedule || mongoose.model<IPractitionerSchedule>('PractitionerSchedule', PractitionerScheduleSchema);
