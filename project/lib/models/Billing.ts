import { defineModel, type Document, type ModelClass } from '@/lib/db';
import { TIER_ORDER } from '@/lib/billing/tiers';

// ─── Payment Transaction ──────────────────────────────────────────────────────
export interface IPaymentTransaction extends Document {
  patientId: string;
  /** Set when a family guardian pays on this patient's behalf; unset = pays for self (default, unchanged behavior). */
  payerId?: string;
  practitionerId?: string;
  facilityId?: string;
  consultationId?: string;
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

// ─── Subscription ─────────────────────────────────────────────────────────────
export interface ISubscription extends Document {
  patientId: string;
  /** Set when a family guardian pays for this patient; unset = pays for self (default, unchanged behavior). */
  payerId?: string;
  tier: 'individual' | 'family' | 'family_plus';
  status: 'active' | 'trial' | 'cancelled' | 'past_due';
  startDate: Date;
  nextBillingDate: Date;
  paymentMethodId?: string;
  autoRenew: boolean;
  price: number;
}

// ─── Payout Request (Practitioner → Platform) ─────────────────────────────────
export interface IPayoutRequest extends Document {
  practitionerId: string;
  facilityId?: string;
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
  approvedBy?: string;
}

// ─── Payment Method (saved cards / accounts) ──────────────────────────────────
export interface IPaymentMethod extends Document {
  patientId: string;
  /** Name on the card or bank account. Never the number itself. */
  holderName?: string;
  /** The address given with this instrument at checkout. */
  billingAddress?: {
    addressLine?: string;
    city?: string;
    postalCode?: string;
  };
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

// ─── Platform Fee Configuration (Mega Admin) ──────────────────────────────────
export interface IPlatformFeeConfig extends Document {
  platformFeePercent: number;
  subscriptionFeePercent: number;
  updatedBy: string;
  updatedAt: Date;
  notes: string;
}

// ─── Hospital Revenue (Hospital Admin view) ────────────────────────────────────
export interface IHospitalRevenue extends Document {
  facilityId: string;
  period: 'daily' | 'monthly' | 'yearly';
  date: Date;
  totalRevenue: number;
  byDepartment: Array<{ department: string; revenue: number; transactionCount: number }>;
  pendingPayouts: number;
  completedPayouts: number;
  netRevenue: number;
}

// ─── Billing Audit Log ─────────────────────────────────────────────────────────
export interface IBillingAuditLog extends Document {
  actorId: string;
  actionType: string;
  targetId?: string;
  targetModel?: string;
  details: Record<string, any>;
  timestamp: Date;
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export const PaymentTransaction: ModelClass<IPaymentTransaction> = defineModel<IPaymentTransaction>({
  name: 'PaymentTransaction', table: 'payment_transactions',
  columns: { timestamp: 'occurred_at' },
  refs: { patientId: 'User', payerId: 'User', practitionerId: 'User', facilityId: 'Facility', consultationId: 'Consultation' },
});
export const Subscription: ModelClass<ISubscription> = defineModel<ISubscription>({
  name: 'Subscription', table: 'subscriptions',
  refs: { patientId: 'User', payerId: 'User' },
});
export const PayoutRequest: ModelClass<IPayoutRequest> = defineModel<IPayoutRequest>({
  name: 'PayoutRequest', table: 'payout_requests',
  columns: {
    'bankAccount.accountHolder': 'bank_account_holder',
    'bankAccount.bankName': 'bank_name',
    'bankAccount.accountNumber': 'bank_account_number',
    'bankAccount.branchCode': 'bank_branch_code',
  },
  refs: { practitionerId: 'User', facilityId: 'Facility', approvedBy: 'User' },
});
export const PaymentMethod: ModelClass<IPaymentMethod> = defineModel<IPaymentMethod>({
  name: 'PaymentMethod', table: 'payment_methods',
  columns: {
    last4: 'card_last4',
    expiryMonth: 'card_expiry_month',
    expiryYear: 'card_expiry_year',
    accountNumber: 'bank_account_number',
    branchCode: 'bank_branch_code',
    policyNumber: 'insurance_policy_number',
    coverageType: 'insurance_coverage_type',
    'billingAddress.addressLine': 'billing_address_line',
    'billingAddress.city': 'billing_address_city',
    'billingAddress.postalCode': 'billing_address_postal_code',
  },
  refs: { patientId: 'User' },
});
export const PlatformFeeConfig: ModelClass<IPlatformFeeConfig> = defineModel<IPlatformFeeConfig>({
  name: 'PlatformFeeConfig', table: 'platform_fee_config',
  refs: { updatedBy: 'User' },
});
export const HospitalRevenue: ModelClass<IHospitalRevenue> = defineModel<IHospitalRevenue>({
  name: 'HospitalRevenue', table: 'hospital_revenue',
  columns: { date: 'revenue_date' },
  refs: { facilityId: 'Facility' },
  children: {
    byDepartment: { table: 'hospital_revenue_by_department', fk: 'hospital_revenue_id' },
  },
});
export const BillingAuditLog: ModelClass<IBillingAuditLog> = defineModel<IBillingAuditLog>({
  name: 'BillingAuditLog', table: 'audit_logs',
  columns: { actionType: 'action', targetModel: 'target_type', details: 'metadata', timestamp: 'created_at' },
  refs: { actorId: 'User' },
});
