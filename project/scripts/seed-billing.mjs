/**
 * scripts/seed-billing.mjs
 * Run: node --env-file=.env.local scripts/seed-billing.mjs
 *
 * Seeds:
 *  - 20 PaymentTransaction per patient (mixed status)
 *  - 5 PayoutRequest per practitioner (mixed status)
 *  - PaymentMethod records per patient
 *  - HospitalRevenue records per facility
 *  - PlatformFeeConfig (singleton)
 *  - BillingAuditLog entries
 */

import mongoose from 'mongoose';
import { faker } from '@faker-js/faker';

// ─── MongoDB Connection ───────────────────────────────────────────────────────
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found. Run with: node --env-file=.env.local scripts/seed-billing.mjs');
  process.exit(1);
}

// ─── Schema Definitions (inline, avoiding TS) ─────────────────────────────────
const PaymentTransactionSchema = new mongoose.Schema({
  patientId:            { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  practitionerId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  facilityId:           { type: mongoose.Schema.Types.ObjectId, ref: 'Facility' },
  consultationId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Consultation' },
  amount:               Number,
  currency:             { type: String, default: 'ZAR' },
  provider:             String,
  status:               String,
  description:          String,
  category:             String,
  providerTransactionId: String,
  receiptUrl:           String,
  medicalAidClaimRef:   String,
  platformFeeAmount:    Number,
  practitionerEarnings: Number,
  timestamp:            { type: Date, default: Date.now },
}, { timestamps: true });

const SubscriptionSchema = new mongoose.Schema({
  patientId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  tier:            String,
  status:          String,
  startDate:       Date,
  nextBillingDate: Date,
  paymentMethodId: String,
  autoRenew:       Boolean,
  price:           Number,
}, { timestamps: true });

const PayoutRequestSchema = new mongoose.Schema({
  practitionerId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  facilityId:          { type: mongoose.Schema.Types.ObjectId, ref: 'Facility' },
  amount:              Number,
  currency:            { type: String, default: 'ZAR' },
  status:              String,
  requestedAt:         { type: Date, default: Date.now },
  processedAt:         Date,
  bankAccount: {
    accountHolder:   String,
    bankName:        String,
    accountNumber:   String,
    branchCode:      String,
  },
  periodFrom:          Date,
  periodTo:            Date,
  consultationCount:   Number,
  platformFeeDeducted: Number,
  notes:               String,
  approvedBy:          { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

const PaymentMethodSchema = new mongoose.Schema({
  patientId:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type:               String,
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

const PlatformFeeConfigSchema = new mongoose.Schema({
  platformFeePercent:     { type: Number, default: 15 },
  consultationFeePercent: { type: Number, default: 12 },
  subscriptionFeePercent: { type: Number, default: 10 },
  updatedBy:              { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes:                  String,
}, { timestamps: true });

const HospitalRevenueSchema = new mongoose.Schema({
  facilityId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Facility' },
  period:           String,
  date:             Date,
  totalRevenue:     Number,
  byDepartment:     [{ department: String, revenue: Number, transactionCount: Number }],
  pendingPayouts:   Number,
  completedPayouts: Number,
  netRevenue:       Number,
}, { timestamps: true });

const BillingAuditLogSchema = new mongoose.Schema({
  actorId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  actionType:  String,
  targetId:    mongoose.Schema.Types.ObjectId,
  targetModel: String,
  details:     mongoose.Schema.Types.Mixed,
  timestamp:   { type: Date, default: Date.now },
}, { timestamps: true });

// ─── Models ────────────────────────────────────────────────────────────────────
const PaymentTransaction = mongoose.models.PaymentTransaction || mongoose.model('PaymentTransaction', PaymentTransactionSchema);
const Subscription       = mongoose.models.Subscription       || mongoose.model('Subscription',       SubscriptionSchema);
const PayoutRequest      = mongoose.models.PayoutRequest      || mongoose.model('PayoutRequest',      PayoutRequestSchema);
const PaymentMethod      = mongoose.models.PaymentMethod      || mongoose.model('PaymentMethod',      PaymentMethodSchema);
const PlatformFeeConfig  = mongoose.models.PlatformFeeConfig  || mongoose.model('PlatformFeeConfig',  PlatformFeeConfigSchema);
const HospitalRevenue    = mongoose.models.HospitalRevenue    || mongoose.model('HospitalRevenue',    HospitalRevenueSchema);
const BillingAuditLog    = mongoose.models.BillingAuditLog    || mongoose.model('BillingAuditLog',    BillingAuditLogSchema);

// Minimal User/Facility schemas just for lookups
const UserSchema = new mongoose.Schema({ role: String });
const FacilitySchema = new mongoose.Schema({ name: String });
const User     = mongoose.models.User     || mongoose.model('User',     UserSchema);
const Facility = mongoose.models.Facility || mongoose.model('Facility', FacilitySchema);

// ─── Helpers ──────────────────────────────────────────────────────────────────
const randItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
const subtractDays = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

const SA_BANKS = [
  { bankName: 'First National Bank', branchCode: '250655' },
  { bankName: 'ABSA Bank',           branchCode: '632005' },
  { bankName: 'Standard Bank',       branchCode: '051001' },
  { bankName: 'Nedbank',             branchCode: '198765' },
  { bankName: 'Capitec Bank',        branchCode: '470010' },
];

const CARD_BRANDS      = ['Visa', 'Mastercard', 'American Express'];
const MEDICAL_AIDS     = ['Discovery Health', 'Bonitas', 'Momentum Health', 'GEMS', 'Fedhealth'];
const INSURANCE        = ['Sanlam', 'Old Mutual', 'Liberty Life', 'Momentum Insure'];
const DEPARTMENTS      = ['Emergency', 'Cardiology', 'Radiology', 'Pharmacy', 'General Ward', 'ICU', 'Paediatrics', 'Gynaecology'];
const CATEGORIES       = ['consultation', 'subscription', 'procedure', 'pharmacy', 'lab'];
const PROVIDERS        = ['medical_aid', 'card', 'eft', 'cash', 'wallet'];
const STATUSES         = ['completed', 'completed', 'completed', 'pending', 'failed', 'refunded'];
const PAYOUT_STATUSES  = ['pending', 'approved', 'paid', 'rejected', 'pending'];
const SUBSCRIPTION_TIERS = [
  { tier: 'free',   price: 0 },
  { tier: 'pro',    price: 299 },
  { tier: 'family', price: 499 },
];

// ─── Main Seed ────────────────────────────────────────────────────────────────
async function seedBilling() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas');

    // Purge billing collections
    console.log('🗑️  Clearing billing collections...');
    await Promise.all([
      PaymentTransaction.deleteMany({}),
      Subscription.deleteMany({}),
      PayoutRequest.deleteMany({}),
      PaymentMethod.deleteMany({}),
      PlatformFeeConfig.deleteMany({}),
      HospitalRevenue.deleteMany({}),
      BillingAuditLog.deleteMany({}),
    ]);
    console.log('✅ Billing collections cleared.');

    // Load existing users & facilities
    const patients       = await User.find({ role: 'patient' }).lean();
    const practitioners  = await User.find({ role: 'practitioner' }).lean();
    const facilities     = await Facility.find({}).lean();
    const superAdmins    = await User.find({ role: { $in: ['super_admin', 'mega_admin', 'inspector'] } }).lean();
    const hospitalAdmins = await User.find({ role: 'hospital_admin' }).lean();

    console.log(`📋 Found: ${patients.length} patients, ${practitioners.length} practitioners, ${facilities.length} facilities`);

    if (patients.length === 0) {
      console.warn('⚠️  No patients found. Run the main seed first: node --env-file=.env.local scripts/seed.mjs');
      process.exit(1);
    }

    // ── 1. PAYMENT TRANSACTIONS (20 per patient) ──────────────────────────────
    console.log('\n💳 Seeding Payment Transactions (20 per patient)...');
    let totalTransactions = 0;
    for (const patient of patients) {
      for (let i = 0; i < 20; i++) {
        const amount     = 200 + Math.random() * 2500;
        const fee        = amount * 0.12;
        const earnings   = amount - fee;
        const status     = randItem(STATUSES);
        const category   = randItem(CATEGORIES);
        const provider   = randItem(PROVIDERS);
        const practitioner = practitioners.length > 0 ? randItem(practitioners) : null;
        const facility     = facilities.length > 0 ? randItem(facilities) : null;

        await PaymentTransaction.create({
          patientId:            patient._id,
          practitionerId:       practitioner?._id,
          facilityId:           facility?._id,
          amount:               parseFloat(amount.toFixed(2)),
          currency:             'ZAR',
          provider,
          status,
          description:          `${category[0].toUpperCase() + category.slice(1)} — ${faker.lorem.words(3)}`,
          category,
          providerTransactionId: `TXN-${faker.string.alphanumeric(10).toUpperCase()}`,
          receiptUrl:           `https://receipts.digihealth.co.za/${faker.string.uuid()}`,
          medicalAidClaimRef:   provider === 'medical_aid' ? `MA-${faker.string.numeric(8)}` : undefined,
          platformFeeAmount:    parseFloat(fee.toFixed(2)),
          practitionerEarnings: parseFloat(earnings.toFixed(2)),
          timestamp:            subtractDays(Math.floor(Math.random() * 180)),
        });
        totalTransactions++;
      }
    }
    console.log(`✅ Created ${totalTransactions} payment transactions`);

    // ── 2. SUBSCRIPTIONS (per patient) ────────────────────────────────────────
    console.log('\n📦 Seeding Subscriptions...');
    for (const patient of patients) {
      const { tier, price } = randItem(SUBSCRIPTION_TIERS);
      const status          = randItem(['active', 'active', 'trial', 'cancelled']);
      const startDate       = subtractDays(Math.floor(Math.random() * 90));
      const nextBillingDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);

      await Subscription.create({
        patientId:       patient._id,
        tier,
        status,
        startDate,
        nextBillingDate,
        paymentMethodId: faker.string.alphanumeric(16),
        autoRenew:       status === 'active',
        price,
      });
    }
    console.log(`✅ Created ${patients.length} subscriptions`);

    // ── 3. PAYMENT METHODS (2-3 per patient) ──────────────────────────────────
    console.log('\n💳 Seeding Payment Methods...');
    let totalMethods = 0;
    for (const patient of patients) {
      // Card
      await PaymentMethod.create({
        patientId:   patient._id,
        type:        'card',
        isDefault:   true,
        cardBrand:   randItem(CARD_BRANDS),
        last4:       faker.string.numeric(4),
        expiryMonth: faker.number.int({ min: 1, max: 12 }),
        expiryYear:  faker.number.int({ min: 2025, max: 2030 }),
      });
      // Medical Aid
      await PaymentMethod.create({
        patientId:          patient._id,
        type:               'medical_aid',
        isDefault:          false,
        medicalAidProvider: randItem(MEDICAL_AIDS),
        medicalAidNumber:   faker.string.numeric(10),
        insuranceProvider:  randItem(INSURANCE),
        policyNumber:       `POL-${faker.string.numeric(8)}`,
        coverageType:       randItem(['Comprehensive', 'Hospital Only', 'Primary Care']),
      });
      totalMethods += 2;
    }
    console.log(`✅ Created ${totalMethods} payment methods`);

    // ── 4. PAYOUT REQUESTS (5 per practitioner) ───────────────────────────────
    console.log('\n🏦 Seeding Payout Requests (5 per practitioner)...');
    let totalPayouts = 0;
    for (const pract of practitioners) {
      const bank = randItem(SA_BANKS);
      for (let i = 0; i < 5; i++) {
        const periodDaysBack = 30 * (i + 1);
        const periodFrom     = subtractDays(periodDaysBack + 30);
        const periodTo       = subtractDays(periodDaysBack);
        const grossAmount    = 3000 + Math.random() * 15000;
        const fee            = grossAmount * 0.12;
        const status         = randItem(PAYOUT_STATUSES);
        const approver       = hospitalAdmins.length > 0 ? randItem(hospitalAdmins) : null;

        await PayoutRequest.create({
          practitionerId:      pract._id,
          facilityId:          facilities.length > 0 ? randItem(facilities)._id : undefined,
          amount:              parseFloat((grossAmount - fee).toFixed(2)),
          currency:            'ZAR',
          status,
          requestedAt:         subtractDays(periodDaysBack),
          processedAt:         ['paid', 'approved', 'rejected'].includes(status) ? subtractDays(periodDaysBack - 3) : undefined,
          bankAccount: {
            accountHolder: `${faker.person.firstName()} ${faker.person.lastName()}`,
            bankName:      bank.bankName,
            accountNumber: faker.string.numeric(10),
            branchCode:    bank.branchCode,
          },
          periodFrom,
          periodTo,
          consultationCount:   faker.number.int({ min: 8, max: 45 }),
          platformFeeDeducted: parseFloat(fee.toFixed(2)),
          notes:               randItem(['Monthly payout', 'Quarterly settlement', 'On-demand withdrawal']),
          approvedBy:          status !== 'pending' && approver ? approver._id : undefined,
        });
        totalPayouts++;
      }
    }
    console.log(`✅ Created ${totalPayouts} payout requests`);

    // ── 5. HOSPITAL REVENUE (monthly for 12 months per facility) ─────────────
    console.log('\n🏥 Seeding Hospital Revenue...');
    let totalRevRecords = 0;
    for (const facility of facilities) {
      for (let m = 0; m < 12; m++) {
        const date    = new Date(Date.now() - m * 30 * 24 * 60 * 60 * 1000);
        const revenue = 50000 + Math.random() * 250000;
        const pending = revenue * 0.1;
        const payouts = revenue * 0.35;
        const net     = revenue - pending - payouts;

        await HospitalRevenue.create({
          facilityId:       facility._id,
          period:           'monthly',
          date,
          totalRevenue:     parseFloat(revenue.toFixed(2)),
          byDepartment:     DEPARTMENTS.map(dept => ({
            department:        dept,
            revenue:           parseFloat((Math.random() * revenue / DEPARTMENTS.length * 2).toFixed(2)),
            transactionCount:  faker.number.int({ min: 5, max: 80 }),
          })),
          pendingPayouts:   parseFloat(pending.toFixed(2)),
          completedPayouts: parseFloat(payouts.toFixed(2)),
          netRevenue:       parseFloat(net.toFixed(2)),
        });
        totalRevRecords++;
      }
    }
    console.log(`✅ Created ${totalRevRecords} hospital revenue records`);

    // ── 6. PLATFORM FEE CONFIGURATION ─────────────────────────────────────────
    console.log('\n⚙️  Seeding Platform Fee Configuration...');
    const adminActor = superAdmins[0] || hospitalAdmins[0] || patients[0];
    await PlatformFeeConfig.create({
      platformFeePercent:     15,
      consultationFeePercent: 12,
      subscriptionFeePercent: 10,
      updatedBy:              adminActor?._id,
      notes:                  'Standard SA market fee structure. Revenue share applied at payment processing.',
    });
    console.log('✅ Platform fee config created');

    // ── 7. BILLING AUDIT LOGS ─────────────────────────────────────────────────
    console.log('\n📝 Seeding Billing Audit Logs...');
    const auditActions = [
      'PAYOUT_REQUESTED', 'PAYOUT_APPROVED', 'PAYOUT_REJECTED',
      'PLATFORM_FEE_UPDATED', 'SUBSCRIPTION_UPGRADED', 'SUBSCRIPTION_CANCELLED',
      'PAYMENT_REFUNDED', 'PAYMENT_METHOD_ADDED', 'PAYMENT_METHOD_REMOVED',
    ];
    const allUsers = [...patients, ...practitioners, ...superAdmins, ...hospitalAdmins];
    for (let i = 0; i < 50; i++) {
      const actor = randItem(allUsers);
      const target = randItem(allUsers);
      await BillingAuditLog.create({
        actorId:     actor._id,
        actionType:  randItem(auditActions),
        targetId:    target._id,
        targetModel: 'User',
        details:     { amount: parseFloat((Math.random() * 5000).toFixed(2)), reason: faker.lorem.sentence() },
        timestamp:   subtractDays(Math.floor(Math.random() * 60)),
      });
    }
    console.log('✅ Created 50 billing audit logs');

    console.log('\n🌟 BILLING SEED COMPLETE!');
    console.log(`💰 Summary:
    - ${totalTransactions} payment transactions
    - ${patients.length} subscriptions
    - ${totalMethods} payment methods
    - ${totalPayouts} payout requests
    - ${totalRevRecords} hospital revenue records
    - 1 platform fee config
    - 50 audit log entries`);

    process.exit(0);
  } catch (err) {
    console.error('❌ Billing seed failed:', err);
    process.exit(1);
  }
}

seedBilling();
