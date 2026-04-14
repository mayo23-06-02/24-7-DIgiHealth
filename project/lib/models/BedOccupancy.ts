import mongoose, { Schema, Document } from 'mongoose';

export interface IBedOccupancy extends Document {
  facilityId: mongoose.Types.ObjectId;
  timestamp: Date;
  totalBeds: number;
  occupiedBeds: number;
  icuOccupied: number;
  icuTotal: number;
  emergencyOccupied: number;
  emergencyTotal: number;
}

const BedOccupancySchema = new Schema({
  facilityId: { type: Schema.Types.ObjectId, ref: 'Facility', required: true },
  timestamp: { type: Date, default: Date.now },
  totalBeds: { type: Number, required: true },
  occupiedBeds: { type: Number, required: true },
  icuOccupied: { type: Number, required: true },
  icuTotal: { type: Number, required: true },
  emergencyOccupied: { type: Number, required: true },
  emergencyTotal: { type: Number, required: true },
}, { timestamps: true });

export default mongoose.models.BedOccupancy || mongoose.model<IBedOccupancy>('BedOccupancy', BedOccupancySchema);
