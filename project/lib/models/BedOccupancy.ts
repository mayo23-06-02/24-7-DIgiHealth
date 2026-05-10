import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBedOccupancy extends Document {
  facilityId: mongoose.Types.ObjectId;
  totalBeds: number;
  occupiedBeds: number;
  icuOccupied: number;
  emergencyOccupied: number;
  timestamp: Date;
}

const BedOccupancySchema = new Schema<IBedOccupancy>(
  {
    facilityId: { type: Schema.Types.ObjectId, ref: 'Facility', required: true },
    totalBeds: { type: Number, required: true },
    occupiedBeds: { type: Number, required: true },
    icuOccupied: { type: Number, default: 0 },
    emergencyOccupied: { type: Number, default: 0 },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

BedOccupancySchema.index({ facilityId: 1, timestamp: -1 });

const BedOccupancy: Model<IBedOccupancy> = mongoose.models.BedOccupancy || mongoose.model<IBedOccupancy>('BedOccupancy', BedOccupancySchema);
export default BedOccupancy;
