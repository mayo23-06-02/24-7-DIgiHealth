import { defineModel, type Document, type ModelClass } from '@/lib/db';
export interface IBedOccupancy extends Document {
  facilityId: string;
  totalBeds: number;
  occupiedBeds: number;
  icuOccupied: number;
  emergencyOccupied: number;
  timestamp: Date;
}

export const BedOccupancy: ModelClass<IBedOccupancy> = defineModel<IBedOccupancy>({
  name: 'BedOccupancy', table: 'bed_occupancy',
  columns: { timestamp: 'recorded_at' },
  refs: { facilityId: 'Facility' },
});
export default BedOccupancy;
