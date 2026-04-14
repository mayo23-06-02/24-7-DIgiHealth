import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IFacility extends Document {
  name: string;
  facilityType: 'Public' | 'Private' | 'NGO';
  address: { street?: string; city: string; province: string; coordinates: [number, number] };
  contactInfo: { phone?: string; emergencyPhone?: string; email?: string };
  bedCapacity: { total: number; generalAvailable: number; icuAvailable: number };
  currentWaitTimeMins: number;
  isOpen: boolean;
  specialties: string[];
  emergencyServices: boolean;
}

const FacilitySchema = new Schema<IFacility>({
  name: { type: String, required: true },
  facilityType: { type: String, enum: ['Public', 'Private', 'NGO'] },
  address: {
    street: String, city: String, province: String,
    coordinates: { type: [Number], index: '2dsphere' }
  },
  contactInfo: { phone: String, emergencyPhone: String, email: String },
  bedCapacity: { total: Number, generalAvailable: Number, icuAvailable: Number },
  currentWaitTimeMins: { type: Number, default: 0 },
  isOpen: { type: Boolean, default: true },
  specialties: [{ type: String }],
  emergencyServices: { type: Boolean, default: false }
});

export const Facility = mongoose.models.Facility || mongoose.model<IFacility>('Facility', FacilitySchema);
export default Facility;
