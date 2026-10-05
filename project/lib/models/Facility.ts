import { defineModel, type Document, type ModelClass } from '@/lib/db';
export interface IFacility extends Document {
  fileNumberPrefix?: string;
  name: string;
  facilityType: 'Public' | 'Private' | 'NGO';
  address: { street?: string; city: string; province: string; coordinates: [number, number] };
  contactInfo: { phone?: string; emergencyPhone?: string; email?: string };
  bedCapacity: { total: number; generalAvailable: number; icuAvailable: number };
  currentWaitTimeMins: number;
  isOpen: boolean;
  specialties: string[];
  emergencyServices: boolean;
  logo?: string;
  wallpaper?: string;
  regCertificate?: string;
}

export const Facility: ModelClass<IFacility> = defineModel<IFacility>({
  name: 'Facility', table: 'facilities',
  nest: { address: 'address_', contactInfo: 'contact_', bedCapacity: 'bed_' },
  virtualPaths: { 'address.coordinates': { cols: ['location_lat', 'location_lng'] } },
  fromRow: (doc, row) => {
    delete doc.locationLat;
    delete doc.locationLng;
    if (row.location_lng != null && row.location_lat != null) {
      doc.address = { ...(doc.address ?? {}), coordinates: [row.location_lng, row.location_lat] };
    }
  },
  toRow: (row, doc) => {
    const c = doc.address?.coordinates;
    if (Array.isArray(c) && c.length === 2) {
      row.location_lng = c[0];
      row.location_lat = c[1];
    }
  },
});
export default Facility;
