import { defineModel, type Document, type ModelClass } from '@/lib/db';

export type MedicalInvoiceStatus = 'issued' | 'submitted' | 'paid' | 'partially_paid' | 'rejected' | 'cancelled';

export interface IMedicalInvoiceItem {
  _id?: string;
  position: number;
  tariffCode: string;
  icd10Code: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

/**
 * A medical-aid invoice issued by a doctor at a hospital that has medical-aid billing on.
 * Patient, medical aid, doctor and facility details are copied at issue time.
 */
export interface IMedicalInvoice extends Document {
  invoiceNumber: string;
  facilityId: string;
  practitionerId: string;
  patientId: string;
  consultationId?: string;
  status: MedicalInvoiceStatus;
  serviceDate: Date;
  patientName: string;
  patientIdNumber?: string;
  medicalAidProvider?: string;
  medicalAidPlan?: string;
  medicalAidMemberNumber?: string;
  dependantCode?: string;
  practitionerName: string;
  hpcsaNumber?: string;
  practiceNumber?: string;
  facilityName: string;
  notes?: string;
  total: number;
  currency: string;
  issuedAt: Date;
  statusChangedAt?: Date;
  items: IMedicalInvoiceItem[];
}

export const MedicalInvoice: ModelClass<IMedicalInvoice> = defineModel<IMedicalInvoice>({
  name: 'MedicalInvoice', table: 'medical_invoices',
  refs: { patientId: 'User', practitionerId: 'User', facilityId: 'Facility', consultationId: 'Consultation' },
  children: { items: { table: 'medical_invoice_items', fk: 'invoice_id', orderBy: 'position' } },
});
export default MedicalInvoice;
