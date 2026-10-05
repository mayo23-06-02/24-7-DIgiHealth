import { defineModel, type Document, type ModelClass } from '@/lib/db';

export interface IPractitionerBilling extends Document {
  patientId?: string;
  practitionerId?: string;
  consultationId?: string;
  amount?: number;
  type?: string;
  status?: string;
  paymentMethod?: string;
  date: Date;
  invoiceNumber?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const PractitionerBilling: ModelClass<IPractitionerBilling> = defineModel<IPractitionerBilling>({
  name: 'PractitionerBilling', table: 'billings',
  columns: { date: 'billed_at' },
  refs: { patientId: 'User', practitionerId: 'User', consultationId: 'Consultation' },
});
