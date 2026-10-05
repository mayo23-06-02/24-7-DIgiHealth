import { defineModel, type Document, type ModelClass } from '@/lib/db';
export interface IHospitalAppointment extends Document {
  facilityId: string;
  patientId: string;
  practitionerId: string;
  type: "consultation" | "procedure" | "lab";
  scheduledStart: Date;
  scheduledEnd: Date;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  room: string;
}

export const HospitalAppointment: ModelClass<IHospitalAppointment> = defineModel<IHospitalAppointment>({
  name: 'HospitalAppointment', table: 'hospital_appointments',
  refs: { facilityId: 'Facility', patientId: 'User', practitionerId: 'User' },
});
export default HospitalAppointment;
