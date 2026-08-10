import mongoose, { Schema, Document, Types } from 'mongoose';
import { TIER_ORDER } from '@/lib/billing/tiers';

// ─── Payment Transaction ──────────────────────────────────────────────────────
export interface IPaymentTransaction extends Document {
  patientId: Types.ObjectId;
  /** Set when a family guardian pays on this patient's behalf; unset = pays for self (default, unchanged behavior). */
  payerId?: Types.ObjectId;
  practitionerId?: Types.ObjectId;
  facilityId?: Types.ObjectId;
  consultationId?: Types.ObjectId;
  amount: number;
  currency: string;
  provider: 'medical_aid' | 'card' | 'eft' | 'cash' | 'wallet';
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  description: string;
  category: 'service_booking' | 'subscription' | 'procedure' | 'pharmacy' | 'lab';
  providerTransactionId?: string;
  receiptUrl?: string;
  medicalAidClaimRef?: string;
  platformFeeAmount?: number;
  practitionerEarnings?: number;
  timestamp: Date;
}
const PaymentTransactionSchema = new Schema<IPaymentTransaction>({
  patientId:              { type: Schema.Types.ObjectId, ref: 'User' },
  payerId:                { type: Schema.Types.ObjectId, ref: 'User' },
  practitionerId:         { type: Schema.Types.ObjectId, ref: 'User' },
  facilityId:             { type: Schema.Types.ObjectId, ref: 'Facility' },
  consultationId:         { type: Schema.Types.ObjectId, ref: 'Consultation' },
  amount:                 Number,
  currency:               { type: String, default: 'ZAR' },
  provider:               { type: String, enum: ['medical_aid', 'card', 'eft', 'cash', 'wallet'] },
  status:                 { type: String, enum: ['pending', 'completed', 'failed', 'refunded'], default: 'pending' },
  description:            String,
  category:               { type: String, enum: ['service_booking', 'subscription', 'procedure', 'pharmacy', 'lab'] },
  providerTransactionId:  String,
  receiptUrl:             String,
  medicalAidClaimRef:     String,
  platformFeeAmount:      Number,
  practitionerEarnings:   Number,
  timestamp:              { type: Date, default: Date.now },
}, { timestamps: true });

// ─── Subscription ─────────────────────────────────────────────────────────────
export interface ISubscription extends Document {
  patientId: Types.ObjectId;
  /** Set when a family guardian pays for this patient; unset = pays for self (default, unchanged behavior). */
  payerId?: Types.ObjectId;
  tier: 'individual' | 'family' | 'family_plus';
  status: 'active' | 'trial' | 'cancelled' | 'past_due';
  startDate: Date;
  nextBillingDate: Date;
  paymentMethodId?: string;
  autoRenew: boolean;
  price: number;
}
const SubscriptionSchema = new Schema<ISubscription>({
  patientId:       { type: Schema.Types.ObjectId, ref: 'User' },
  payerId:         { type: Schema.Types.ObjectId, ref: 'User' },
  tier:            { type: String, enum: TIER_ORDER, default: 'individual' },
  status:          { type: String, enum: ['active', 'trial', 'cancelled', 'past_due'] },
  startDate:       Date,
  nextBillingDate: Date,
  paymentMethodId: String,
  autoRenew:       { type: Boolean, default: true },
  price:           { type: Number, default: 0 },
}, { timestamps: true });

// ─── Payout Request (Practitioner → Platform) ─────────────────────────────────
export interface IPayoutRequest extends Document {
  practitionerId: Types.ObjectId;
  facilityId?: Types.ObjectId;
  amount: number;
  currency: string;
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  requestedAt: Date;
  processedAt?: Date;
  bankAccount: {
    accountHolder: string;
    bankName: string;
    accountNumber: string;
    branchCode: string;
  };
  periodFrom: Date;
  periodTo: Date;
  consultationCount: number;
  platformFeeDeducted: number;
  notes?: string;
  approvedBy?: Types.ObjectId;
}
const PayoutRequestSchema = new Schema<IPayoutRequest>({
  practitionerId:   { type: Schema.Types.ObjectId, ref: 'User' },
  facilityId:       { type: Schema.Types.ObjectId, ref: 'Facility' },
  amount:           Number,
  currency:         { type: String, default: 'ZAR' },
  status:           { type: String, enum: ['pending', 'approved', 'paid', 'rejected'], default: 'pending' },
  requestedAt:      { type: Date, default: Date.now },
  processedAt:      Date,
  bankAccount:      {
    accountHolder:  String,
    bankName:       String,
    accountNumber:  String,
    branchCode:     String,
  },
  periodFrom:         Date,
  periodTo:           Date,
  consultationCount:  Number,
  platformFeeDeducted: Number,
  notes:              String,
  approvedBy:         { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// ─── Payment Method (saved cards / accounts) ──────────────────────────────────
export interface IPaymentMethod extends Document {
  patientId: Types.ObjectId;
  type: 'card' | 'medical_aid' | 'eft';
  isDefault: boolean;
  // Card
  cardBrand?: string;
  last4?: string;
  expiryMonth?: number;
  expiryYear?: number;
  // Medical Aid
  medicalAidProvider?: string;
  medicalAidNumber?: string;
  // EFT
  bankName?: string;
  accountNumber?: string;
  branchCode?: string;
  // Insurance
  insuranceProvider?: string;
  policyNumber?: string;
  coverageType?: string;
  createdAt?: Date;
}
const PaymentMethodSchema = new Schema<IPaymentMethod>({
  patientId:          { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type:               { type: String, enum: ['card', 'medical_aid', 'eft'] },
  isDefault:          { type: Boolean, default: false },
  cardBrand:          String,
  last4:              String,
  expiryMonth:        Number,
  expiryYear:         Number,
  medicalAidProvider: String,
  medicalAidNumber:   String,
  bankName:           String,
  accountNumber:      String,
  branchCode:         String,
  insuranceProvider:  String,
  policyNumber:       String,
  coverageType:       String,
}, { timestamps: true });

// ─── Platform Fee Configuration (Mega Admin) ──────────────────────────────────
export interface IPlatformFeeConfig extends Document {
  platformFeePercent: number;
  subscriptionFeePercent: number;
  updatedBy: Types.ObjectId;
  updatedAt: Date;
  notes: string;
}
const PlatformFeeConfigSchema = new Schema<IPlatformFeeConfig>({
  platformFeePercent:       { type: Number, default: 15 },
  subscriptionFeePercent:   { type: Number, default: 10 },
  updatedBy:                { type: Schema.Types.ObjectId, ref: 'User' },
  notes:                    String,
}, { timestamps: true });

// ─── Hospital Revenue (Hospital Admin view) ────────────────────────────────────
export interface IHospitalRevenue extends Document {
  facilityId: Types.ObjectId;
  period: 'daily' | 'monthly' | 'yearly';
  date: Date;
  totalRevenue: number;
  byDepartment: Array<{ department: string; revenue: number; transactionCount: number }>;
  pendingPayouts: number;
  completedPayouts: number;
  netRevenue: number;
}
const HospitalRevenueSchema = new Schema<IHospitalRevenue>({
  facilityId:        { type: Schema.Types.ObjectId, ref: 'Facility' },
  period:            { type: String, enum: ['daily', 'monthly', 'yearly'] },
  date:              Date,
  totalRevenue:      Number,
  byDepartment:      [{ department: String, revenue: Number, transactionCount: Number }],
  pendingPayouts:    Number,
  completedPayouts:  Number,
  netRevenue:        Number,
}, { timestamps: true });

// ─── Billing Audit Log ─────────────────────────────────────────────────────────
export interface IBillingAuditLog extends Document {
  actorId: Types.ObjectId;
  actionType: string;
  targetId?: Types.ObjectId;
  targetModel?: string;
  details: Record<string, any>;
  timestamp: Date;
}
const BillingAuditLogSchema = new Schema<IBillingAuditLog>({
  actorId:     { type: Schema.Types.ObjectId, ref: 'User' },
  actionType:  String,
  targetId:    Schema.Types.ObjectId,
  targetModel: String,
  details:     Schema.Types.Mixed,
  timestamp:   { type: Date, default: Date.now },
}, { timestamps: true });

// ─── Exports ──────────────────────────────────────────────────────────────────
export const PaymentTransaction  = mongoose.models.PaymentTransaction  || mongoose.model<IPaymentTransaction>('PaymentTransaction',  PaymentTransactionSchema);
export const Subscription        = mongoose.models.Subscription        || mongoose.model<ISubscription>('Subscription',              SubscriptionSchema);
export const PayoutRequest       = mongoose.models.PayoutRequest       || mongoose.model<IPayoutRequest>('PayoutRequest',            PayoutRequestSchema);
export const PaymentMethod       = mongoose.models.PaymentMethod       || mongoose.model<IPaymentMethod>('PaymentMethod',            PaymentMethodSchema);
export const PlatformFeeConfig   = mongoose.models.PlatformFeeConfig   || mongoose.model<IPlatformFeeConfig>('PlatformFeeConfig',    PlatformFeeConfigSchema);
export const HospitalRevenue     = mongoose.models.HospitalRevenue     || mongoose.model<IHospitalRevenue>('HospitalRevenue',        HospitalRevenueSchema);
export const BillingAuditLog     = mongoose.models.BillingAuditLog     || mongoose.model<IBillingAuditLog>('BillingAuditLog',        BillingAuditLogSchema);
