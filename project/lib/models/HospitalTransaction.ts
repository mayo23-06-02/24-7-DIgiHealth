import { defineModel, type Document, type ModelClass } from '@/lib/db';
export interface IHospitalTransaction extends Document {
  facilityId: string;
  patientId: string;
  amount: number;
  type: "service_booking" | "procedure" | "pharmacy";
  status: "paid" | "pending" | "refunded";
  paymentMethod: "cash" | "card" | "medical_aid";
  timestamp: Date;
}

export const HospitalTransaction: ModelClass<IHospitalTransaction> = defineModel<IHospitalTransaction>({
  name: 'HospitalTransaction', table: 'hospital_transactions',
  columns: { timestamp: 'occurred_at' },
  refs: { facilityId: 'Facility', patientId: 'User' },
});
export default HospitalTransaction;
