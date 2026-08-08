# MongoDB to PostgreSQL Collection Mapping Reference
## 24-7 DigiHealth Platform

**Generated:** 2026-08-08  
**Purpose:** Detailed field-by-field mapping for all MongoDB collections to PostgreSQL tables

---

## Collection: User

**MongoDB Model Location:** `lib/models/User.ts`  
**Total Estimated Records:** 40,000+  
**Migration Complexity:** Medium

### MongoDB Schema
```javascript
{
  _id: ObjectId,
  email: String (unique, lowercase, trimmed),
  passwordHash: String (optional),
  role: String (enum: patient|practitioner|hospital_admin|inspector|super_admin|mega_admin),
  status: String (enum: active|suspended|pending_verification),
  firstName: String,
  lastName: String,
  saId: String (unique, sparse),
  mobile: String,
  phoneE164: String (unique, sparse, indexed),
  mfaEnabled: Boolean,
  supabaseUid: String (unique, sparse),
  emailVerified: Boolean,
  emailVerifiedAt: Date,
  createdAt: Date (timestamps),
  updatedAt: Date (timestamps)
}
```

### PostgreSQL Mapping
| MongoDB Field | PostgreSQL Field | Type | Notes |
|---|---|---|---|
| `_id` | `id` | UUID | Generate UUID from ObjectId hex string |
| `email` | `email` | VARCHAR(255) | Unique, lowercase, trim on insert |
| `passwordHash` | `password_hash` | VARCHAR(255) | NULL if OTP-only |
| `role` | `role` | VARCHAR(50) | Add CHECK constraint |
| `status` | `status` | VARCHAR(50) | Add CHECK constraint |
| `firstName` | `first_name` | VARCHAR(255) | Required |
| `lastName` | `last_name` | VARCHAR(255) | Required |
| `saId` | `sa_id` | VARCHAR(13) | Unique sparse index |
| `mobile` | `mobile` | VARCHAR(20) | Optional |
| `phoneE164` | `phone_e164` | VARCHAR(20) | Unique sparse index |
| `mfaEnabled` | `mfa_enabled` | BOOLEAN | Default false |
| `supabaseUid` | `supabase_uid` | UUID | Unique sparse, for auth sync |
| `emailVerified` | `email_verified` | BOOLEAN | Default false |
| `emailVerifiedAt` | `email_verified_at` | TIMESTAMP WITH TIME ZONE | NULL-able |
| `createdAt` | `created_at` | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() |
| `updatedAt` | `updated_at` | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() |

### Indexes Required
```sql
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_phone_e164 ON users(phone_e164) WHERE phone_e164 IS NOT NULL;
CREATE INDEX idx_users_supabase_uid ON users(supabase_uid) WHERE supabase_uid IS NOT NULL;
CREATE INDEX idx_users_sa_id ON users(sa_id) WHERE sa_id IS NOT NULL;
```

### Migration Notes
- ObjectId conversion: Extract hex string from ObjectId, convert to UUID
- Email: Apply LOWER() and TRIM() during insert
- Password: Some users may have "otp_only:" prefix marker — handle specially
- Status enum values are fixed, can validate during migration
- Role enum values are fixed, can validate during migration

---

## Collection: Patient

**MongoDB Model Location:** `lib/models/Patient.ts`  
**Total Estimated Records:** 15,000+  
**Migration Complexity:** Medium

### MongoDB Schema
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User, unique),
  dateOfBirth: Date,
  gender: String (enum: male|female|other),
  mobileNumber: String,
  medicalHistory: [String],
  allergies: [String],
  currentMedications: [String],
  bloodType: String (optional),
  emergencyContact: {
    name: String,
    phone: String,
    relationship: String
  },
  createdAt: Date,
  updatedAt: Date
}
```

### PostgreSQL Mapping
| MongoDB Field | PostgreSQL Field | Type | Notes |
|---|---|---|---|
| `_id` | `id` | UUID | Generate from ObjectId |
| `userId` | `user_id` | UUID | Foreign key, unique |
| `dateOfBirth` | `date_of_birth` | DATE | Required |
| `gender` | `gender` | VARCHAR(20) | Check constraint |
| `mobileNumber` | `mobile_number` | VARCHAR(20) | Required |
| `bloodType` | `blood_type` | VARCHAR(5) | Optional, e.g., "O+", "AB-" |
| `emergencyContact` | `emergency_contact` | JSONB | Store as JSON object |
| `createdAt` | `created_at` | TIMESTAMP WITH TIME ZONE | |
| `updatedAt` | `updated_at` | TIMESTAMP WITH TIME ZONE | |

### Array Fields Normalization
**medicalHistory, allergies, currentMedications → Separate Tables**

```sql
-- Patient medical history (from medicalHistory array)
CREATE TABLE public.patient_medical_history (
  id UUID PRIMARY KEY,
  patient_id UUID REFERENCES patients(id),
  condition TEXT NOT NULL
);

-- Patient allergies (from allergies array)
CREATE TABLE public.patient_allergies (
  id UUID PRIMARY KEY,
  patient_id UUID REFERENCES patients(id),
  allergen TEXT NOT NULL
);

-- Patient medications (from currentMedications array)
CREATE TABLE public.patient_medications (
  id UUID PRIMARY KEY,
  patient_id UUID REFERENCES patients(id),
  medication TEXT NOT NULL
);
```

### Migration Notes
- One Patient record per User (1:1 relationship)
- emergencyContact is always required, store as JSONB
- Arrays should be normalized to separate tables for queryability
- Medical history, allergies, medications may be modified frequently
- Consider denormalization if queries always fetch entire arrays

---

## Collection: Consultation

**MongoDB Model Location:** `lib/models/Consultation.ts`  
**Total Estimated Records:** 100,000+  
**Migration Complexity:** High (complex embedded objects and dates)

### MongoDB Schema
```javascript
{
  _id: ObjectId,
  patientId: ObjectId (ref: User),
  practitionerId: ObjectId (ref: User),
  facilityId: ObjectId (ref: Facility, optional),
  type: String (enum: video|chat|in_person),
  status: String (enum: requested|pending|scheduled|in_progress|completed|cancelled|missed),
  scheduledStartTime: Date,
  scheduledEndTime: Date,
  chiefComplaint: String (optional),
  clinicalRisk: {
    score: Number,
    color: String (enum: green|gray|red),
    factors: [String]
  },
  soapNotes: {
    subjective: String,
    objective: String,
    assessment: String,
    plan: String,
    signedAt: Date
  },
  callMinutesUsed: Number,
  source: String (enum: patient_self_serve|practitioner_schedule|hospital_desk|system),
  requestedTo: ObjectId (ref: User, optional),
  pendingReschedule: {
    proposedStart: Date,
    proposedEnd: Date,
    proposedBy: ObjectId (ref: User),
    proposedAt: Date
  },
  createdAt: Date,
  updatedAt: Date
}
```

### PostgreSQL Mapping
| MongoDB Field | PostgreSQL Field | Type | Notes |
|---|---|---|---|
| `_id` | `id` | UUID | |
| `patientId` | `patient_id` | UUID | Foreign key |
| `practitionerId` | `practitioner_id` | UUID | Foreign key |
| `facilityId` | `facility_id` | UUID | Foreign key, optional |
| `type` | `type` | VARCHAR(50) | Check constraint |
| `status` | `status` | VARCHAR(50) | Check constraint |
| `scheduledStartTime` | `scheduled_start_time` | TIMESTAMP WITH TIME ZONE | Required |
| `scheduledEndTime` | `scheduled_end_time` | TIMESTAMP WITH TIME ZONE | Required |
| `chiefComplaint` | `chief_complaint` | TEXT | Optional |
| `clinicalRisk` | `clinical_risk` | JSONB | Nested object |
| `soapNotes` | `soap_notes` | JSONB | Nested object |
| `callMinutesUsed` | `call_minutes_used` | INTEGER | Default 0 |
| `source` | `source` | VARCHAR(50) | Check constraint |
| `requestedTo` | `requested_to` | UUID | Foreign key, optional |
| `pendingReschedule` | `pending_reschedule` | JSONB | Nested object |
| `createdAt` | `created_at` | TIMESTAMP WITH TIME ZONE | |
| `updatedAt` | `updated_at` | TIMESTAMP WITH TIME ZONE | |

### Indexes Required
```sql
CREATE INDEX idx_consultations_patient_id_scheduled 
  ON consultations(patient_id, scheduled_start_time DESC);
CREATE INDEX idx_consultations_practitioner_id_scheduled 
  ON consultations(practitioner_id, scheduled_start_time DESC);
CREATE INDEX idx_consultations_status ON consultations(status);
```

### Migration Notes
- Complex nested objects (clinicalRisk, soapNotes, pendingReschedule) stored as JSONB
- Dates must be converted to TIMESTAMP WITH TIME ZONE (assume UTC)
- Status enum has 8 values, check all are present
- Compound indexes on (patientId, scheduledStartTime DESC) and (practitionerId, scheduledStartTime DESC) are critical for performance
- requestedTo and pendingReschedule.proposedBy can be NULL

---

## Collection: Conversation

**MongoDB Model Location:** `lib/models/Conversation.ts`  
**Total Estimated Records:** 50,000+  
**Migration Complexity:** Medium

### MongoDB Schema
```javascript
{
  _id: ObjectId,
  consultationId: ObjectId (ref: Consultation, unique sparse),
  patientId: ObjectId (ref: User),
  practitionerId: ObjectId (ref: User),
  status: String (enum: active|ended|pending),
  minutesAllocated: Number,
  minutesUsed: Number,
  minutesRequested: Number,
  minutesApproved: Number,
  startedAt: Date,
  lastActivityAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### PostgreSQL Mapping
| MongoDB Field | PostgreSQL Field | Type | Notes |
|---|---|---|---|
| `_id` | `id` | UUID | |
| `consultationId` | `consultation_id` | UUID | Unique sparse FK |
| `patientId` | `patient_id` | UUID | Foreign key |
| `practitionerId` | `practitioner_id` | UUID | Foreign key |
| `status` | `status` | VARCHAR(50) | Check constraint |
| `minutesAllocated` | `minutes_allocated` | INTEGER | Required |
| `minutesUsed` | `minutes_used` | INTEGER | Default 0 |
| `minutesRequested` | `minutes_requested` | INTEGER | Default 0 |
| `minutesApproved` | `minutes_approved` | INTEGER | Default 0 |
| `startedAt` | `started_at` | TIMESTAMP WITH TIME ZONE | Default NOW() |
| `lastActivityAt` | `last_activity_at` | TIMESTAMP WITH TIME ZONE | Default NOW() |
| `createdAt` | `created_at` | TIMESTAMP WITH TIME ZONE | |
| `updatedAt` | `updated_at` | TIMESTAMP WITH TIME ZONE | |

### Unique Constraint
```sql
CREATE UNIQUE INDEX idx_conversations_consultation_id 
  ON conversations(consultation_id) 
  WHERE consultation_id IS NOT NULL;
```

### Migration Notes
- consultationId can be NULL, so unique index must be sparse (use WHERE clause)
- Most conversations will have a linked consultation, but some may be standalone
- Minutes fields track communication time allocation
- lastActivityAt should be updated whenever a message is added

---

## Collection: Message

**MongoDB Model Location:** `lib/models/Message.ts`  
**Total Estimated Records:** 500,000+  
**Migration Complexity:** High (large volume, idempotency key)

### MongoDB Schema
```javascript
{
  _id: ObjectId,
  conversationId: ObjectId (ref: Conversation, indexed),
  senderId: ObjectId (ref: User),
  receiverId: ObjectId (ref: User),
  content: String,
  type: String (enum: text|image|file|audio|quick_phrase|record_attachment|call_log),
  fileUrl: String (optional),
  fileMime: String (optional),
  mediaId: String (optional),
  recordId: ObjectId (ref: AttachedRecord, optional),
  clientId: String (optional, sparse, indexed with conversationId),
  isRead: Boolean,
  readAt: Date (optional),
  deliveredAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### PostgreSQL Mapping
| MongoDB Field | PostgreSQL Field | Type | Notes |
|---|---|---|---|
| `_id` | `id` | UUID | |
| `conversationId` | `conversation_id` | UUID | Foreign key, indexed |
| `senderId` | `sender_id` | UUID | Foreign key |
| `receiverId` | `receiver_id` | UUID | Foreign key |
| `content` | `content` | TEXT | Optional (some message types may not have content) |
| `type` | `type` | VARCHAR(50) | Check constraint |
| `fileUrl` | `file_url` | TEXT | Optional |
| `fileMime` | `file_mime` | VARCHAR(100) | Optional |
| `mediaId` | `media_id` | TEXT | Supabase media_assets reference |
| `recordId` | `record_id` | UUID | FK to attached_records, optional |
| `clientId` | `client_id` | VARCHAR(255) | For idempotent operations |
| `isRead` | `is_read` | BOOLEAN | Default false |
| `readAt` | `read_at` | TIMESTAMP WITH TIME ZONE | Optional |
| `deliveredAt` | `delivered_at` | TIMESTAMP WITH TIME ZONE | Default NOW() |
| `createdAt` | `created_at` | TIMESTAMP WITH TIME ZONE | |
| `updatedAt` | `updated_at` | TIMESTAMP WITH TIME ZONE | |

### Indexes Required
```sql
CREATE INDEX idx_messages_conversation_id_created 
  ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_receiver_id ON messages(receiver_id);
CREATE UNIQUE INDEX idx_messages_idempotent 
  ON messages(client_id, conversation_id) 
  WHERE client_id IS NOT NULL;
```

### Migration Notes
- **LARGE DATASET:** 500K+ records, migrate in batches of 10K-50K
- clientId is used for idempotent operations (Ably chat integration)
- Unique index on (clientId, conversationId) prevents duplicate sends
- isRead tracks whether recipient has seen message
- deliveredAt tracks when message was delivered to recipient
- File messages store fileUrl (CDN URL) and optionally mediaId (Supabase reference)
- Record attachments reference AttachedRecord table
- This is the largest collection by volume, requires careful indexing
- Consider partitioning by createdAt month for optimal query performance

---

## Collection: Facility

**MongoDB Model Location:** `lib/models/Facility.ts`  
**Total Estimated Records:** 500+  
**Migration Complexity:** Medium (geographic data)

### MongoDB Schema
```javascript
{
  _id: ObjectId,
  name: String,
  facilityType: String (enum: Public|Private|NGO),
  address: {
    street: String,
    city: String,
    province: String,
    coordinates: [Number, Number]  // [lon, lat] GeoJSON format
  },
  contactInfo: {
    phone: String,
    emergencyPhone: String,
    email: String
  },
  bedCapacity: {
    total: Number,
    generalAvailable: Number,
    icuAvailable: Number
  },
  currentWaitTimeMins: Number,
  isOpen: Boolean,
  specialties: [String],
  emergencyServices: Boolean,
  logo: String (URL),
  wallpaper: String (URL),
  regCertificate: String (URL)
}
```

### PostgreSQL Mapping
| MongoDB Field | PostgreSQL Field | Type | Notes |
|---|---|---|---|
| `_id` | `id` | UUID | |
| `name` | `name` | VARCHAR(255) | Required |
| `facilityType` | `facility_type` | VARCHAR(50) | Check constraint |
| `address.street` | `street` | VARCHAR(255) | Optional |
| `address.city` | `city` | VARCHAR(255) | Required |
| `address.province` | `province` | VARCHAR(255) | Required |
| `address.coordinates` | `coordinates` | GEOGRAPHY(POINT, 4326) | PostGIS type |
| `contactInfo.phone` | `phone` | VARCHAR(20) | Optional |
| `contactInfo.emergencyPhone` | `emergency_phone` | VARCHAR(20) | Optional |
| `contactInfo.email` | `email` | VARCHAR(255) | Optional |
| `bedCapacity.total` | `bed_capacity_total` | INTEGER | Optional |
| `bedCapacity.generalAvailable` | `bed_capacity_general_available` | INTEGER | Optional |
| `bedCapacity.icuAvailable` | `bed_capacity_icu_available` | INTEGER | Optional |
| `currentWaitTimeMins` | `current_wait_time_mins` | INTEGER | Default 0 |
| `isOpen` | `is_open` | BOOLEAN | Default true |
| `emergencyServices` | `emergency_services` | BOOLEAN | Default false |
| `logo` | `logo` | TEXT | Optional URL |
| `wallpaper` | `wallpaper` | TEXT | Optional URL |
| `regCertificate` | `reg_certificate` | TEXT | Optional URL |

### Array Fields Normalization
```sql
-- Facility specialties (from specialties array)
CREATE TABLE public.facility_specialties (
  id UUID PRIMARY KEY,
  facility_id UUID REFERENCES facilities(id) ON DELETE CASCADE,
  specialty VARCHAR(255) NOT NULL,
  UNIQUE(facility_id, specialty)
);
```

### Indexes Required
```sql
CREATE INDEX idx_facilities_coordinates ON facilities USING GIST(coordinates);
CREATE INDEX idx_facilities_city_province ON facilities(city, province);
```

### Migration Notes
- **Coordinate conversion:** MongoDB uses [longitude, latitude], PostGIS GEOGRAPHY uses POINT(lon lat)
- PostGIS GIST index enables geographic queries (e.g., find facilities within 10km)
- Must enable PostGIS extension on Supabase
- specialties array should be normalized to separate table
- All URL fields are optional — can be NULL
- bedCapacity fields may be NULL if not tracked for facility

---

## Collection: Prescription

**MongoDB Model Location:** `lib/models/ClinicalData.ts` (IPrescription)  
**Total Estimated Records:** 50,000+  
**Migration Complexity:** Medium (file references)

### MongoDB Schema
```javascript
{
  _id: ObjectId,
  patientId: ObjectId (ref: User),
  practitionerId: ObjectId (ref: User),
  medicationName: String,
  dosage: String,
  instructions: String,
  status: String (enum: active|completed|discontinued),
  prescribedDate: Date,
  refillsRemaining: Number,
  documentUrl: String (optional),
  documentMime: String (optional),
  documentName: String (optional),
  mediaId: String (optional),
  conversationId: ObjectId (ref: Conversation, optional),
  messageId: ObjectId (ref: Message, optional),
  createdAt: Date,
  updatedAt: Date
}
```

### PostgreSQL Mapping
| MongoDB Field | PostgreSQL Field | Type | Notes |
|---|---|---|---|
| `_id` | `id` | UUID | |
| `patientId` | `patient_id` | UUID | Foreign key, indexed |
| `practitionerId` | `practitioner_id` | UUID | Foreign key |
| `medicationName` | `medication_name` | VARCHAR(255) | Required |
| `dosage` | `dosage` | VARCHAR(255) | Optional |
| `instructions` | `instructions` | TEXT | Optional |
| `status` | `status` | VARCHAR(50) | Check constraint |
| `prescribedDate` | `prescribed_date` | TIMESTAMP WITH TIME ZONE | Default NOW() |
| `refillsRemaining` | `refills_remaining` | INTEGER | Default 0 |
| `documentUrl` | `document_url` | TEXT | Optional URL |
| `documentMime` | `document_mime` | VARCHAR(100) | Optional |
| `documentName` | `document_name` | VARCHAR(255) | Optional |
| `mediaId` | `media_id` | TEXT | Supabase media reference |
| `conversationId` | `conversation_id` | UUID | FK, optional |
| `messageId` | `message_id` | UUID | FK, optional |
| `createdAt` | `created_at` | TIMESTAMP WITH TIME ZONE | |
| `updatedAt` | `updated_at` | TIMESTAMP WITH TIME ZONE | |

### Indexes Required
```sql
CREATE INDEX idx_prescriptions_patient_id_date 
  ON prescriptions(patient_id, prescribed_date DESC);
CREATE INDEX idx_prescriptions_practitioner_id 
  ON prescriptions(practitioner_id);
```

### Migration Notes
- Document references can be on Cloudinary (legacy) or Supabase (new media_id)
- Refills tracking allows pharmacist to know how many times prescription can be refilled
- Links to conversation/message show context where prescription was issued
- Status determines if prescription is currently active or historical

---

## Collection: PaymentTransaction

**MongoDB Model Location:** `lib/models/Billing.ts` (IPaymentTransaction)  
**Total Estimated Records:** 200,000+  
**Migration Complexity:** High (financial data, accuracy critical)

### MongoDB Schema
```javascript
{
  _id: ObjectId,
  patientId: ObjectId (ref: User),
  practitionerId: ObjectId (ref: User, optional),
  facilityId: ObjectId (ref: Facility, optional),
  consultationId: ObjectId (ref: Consultation, optional),
  amount: Number,
  currency: String (default: ZAR),
  provider: String (enum: medical_aid|card|eft|cash|wallet),
  status: String (enum: pending|completed|failed|refunded),
  description: String,
  category: String (enum: service_booking|subscription|procedure|pharmacy|lab),
  providerTransactionId: String (optional),
  receiptUrl: String (optional),
  medicalAidClaimRef: String (optional),
  platformFeeAmount: Number (optional),
  practitionerEarnings: Number (optional),
  timestamp: Date
}
```

### PostgreSQL Mapping
| MongoDB Field | PostgreSQL Field | Type | Notes |
|---|---|---|---|
| `_id` | `id` | UUID | |
| `patientId` | `patient_id` | UUID | FK, indexed |
| `practitionerId` | `practitioner_id` | UUID | FK, optional |
| `facilityId` | `facility_id` | UUID | FK, optional |
| `consultationId` | `consultation_id` | UUID | FK, optional |
| `amount` | `amount` | NUMERIC(12, 2) | **USE NUMERIC FOR MONEY** |
| `currency` | `currency` | VARCHAR(10) | Default 'ZAR' |
| `provider` | `provider` | VARCHAR(50) | Check constraint |
| `status` | `status` | VARCHAR(50) | Check constraint |
| `description` | `description` | TEXT | |
| `category` | `category` | VARCHAR(50) | Check constraint |
| `providerTransactionId` | `provider_transaction_id` | VARCHAR(255) | Optional |
| `receiptUrl` | `receipt_url` | TEXT | Optional |
| `medicalAidClaimRef` | `medical_aid_claim_ref` | VARCHAR(255) | Optional |
| `platformFeeAmount` | `platform_fee_amount` | NUMERIC(12, 2) | Optional |
| `practitionerEarnings` | `practitioner_earnings` | NUMERIC(12, 2) | Optional |
| `timestamp` | `timestamp` | TIMESTAMP WITH TIME ZONE | Default NOW() |
| `createdAt` (inferred) | `created_at` | TIMESTAMP WITH TIME ZONE | |
| `updatedAt` (inferred) | `updated_at` | TIMESTAMP WITH TIME ZONE | |

### Indexes Required
```sql
CREATE INDEX idx_payment_transactions_patient_id 
  ON payment_transactions(patient_id);
CREATE INDEX idx_payment_transactions_timestamp 
  ON payment_transactions(timestamp DESC);
CREATE INDEX idx_payment_transactions_status 
  ON payment_transactions(status);
```

### Migration Notes
- **CRITICAL:** Use NUMERIC(12, 2) for money fields, NOT FLOAT/DOUBLE
  - MongoDB: 100.50 → PostgreSQL: 100.50 (stored exactly)
  - NEVER use FLOAT for financial data (causes rounding errors)
- provider enum has 5 values: medical_aid, card, eft, cash, wallet
- status tracks payment processing state
- category identifies transaction type for reporting
- Medical aid claim references are unique per medical aid provider
- Platform fee is deducted from consultation payment
- Practitioner earnings = amount - platform fee

---

## Collection: AuditLog

**MongoDB Model Location:** `lib/models/AuditLog.ts`  
**Total Estimated Records:** 500,000+  
**Migration Complexity:** Medium (large volume, audit critical)

### MongoDB Schema
```javascript
{
  _id: ObjectId,
  actorId: ObjectId (ref: User),
  actorRole: String,
  actorEmail: String (optional),
  action: String (indexed),
  targetType: String (indexed, optional),
  targetId: String (indexed, optional),
  metadata: Mixed (flexible),
  ip: String (optional),
  userAgent: String (optional),
  createdAt: Date
}
```

### PostgreSQL Mapping
| MongoDB Field | PostgreSQL Field | Type | Notes |
|---|---|---|---|
| `_id` | `id` | UUID | |
| `actorId` | `actor_id` | UUID | FK, indexed |
| `actorRole` | `actor_role` | VARCHAR(50) | Required |
| `actorEmail` | `actor_email` | VARCHAR(255) | Optional |
| `action` | `action` | VARCHAR(255) | Indexed |
| `targetType` | `target_type` | VARCHAR(50) | Indexed, optional |
| `targetId` | `target_id` | TEXT | Indexed, optional |
| `metadata` | `metadata` | JSONB | Flexible structure |
| `ip` | `ip_address` | INET | Optional |
| `userAgent` | `user_agent` | TEXT | Optional |
| `createdAt` | `created_at` | TIMESTAMP WITH TIME ZONE | **NO UPDATE** |

### Indexes Required
```sql
CREATE INDEX idx_audit_logs_actor_id_date 
  ON audit_logs(actor_id, created_at DESC);
CREATE INDEX idx_audit_logs_action 
  ON audit_logs(action);
CREATE INDEX idx_audit_logs_target_type_id 
  ON audit_logs(target_type, target_id);
CREATE INDEX idx_audit_logs_created_at 
  ON audit_logs(created_at DESC);
```

### Migration Notes
- **APPEND-ONLY TABLE:** No updates or deletes, only inserts
- actorEmail duplicates information from User table (denormalized for audit clarity)
- metadata stores flexible action-specific data as JSONB
- ip_address uses PostgreSQL INET type for IP address validation
- Indexes on (actorId, createdAt DESC) support "audit trail for user" queries
- targetId is a string (can refer to any table's ID) for flexibility
- Store as IMMUTABLE (add constraint to prevent modifications)

---

## Collection: AttachedRecord

**MongoDB Model Location:** `lib/models/AttachedRecord.ts`  
**Total Estimated Records:** 100,000+  
**Migration Complexity:** High (file storage coordination)

### MongoDB Schema
```javascript
{
  _id: ObjectId,
  consultationId: ObjectId (ref: Consultation, optional),
  conversationId: ObjectId (ref: Conversation, optional),
  patientId: ObjectId (ref: User),
  practitionerId: ObjectId (ref: User, optional),
  type: String (enum: lab_result|prescription|imaging|soap_note|other),
  title: String,
  description: String (optional),
  fileUrl: String,
  fileMime: String,
  fileSize: Number,
  mediaId: String (optional, Supabase reference),
  uploadedAt: Date,
  isRead: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### PostgreSQL Mapping
| MongoDB Field | PostgreSQL Field | Type | Notes |
|---|---|---|---|
| `_id` | `id` | UUID | |
| `consultationId` | `consultation_id` | UUID | FK, optional |
| `conversationId` | `conversation_id` | UUID | FK, optional |
| `patientId` | `patient_id` | UUID | FK, indexed |
| `practitionerId` | `practitioner_id` | UUID | FK, optional |
| `type` | `type` | VARCHAR(50) | Check constraint |
| `title` | `title` | VARCHAR(255) | Required |
| `description` | `description` | TEXT | Optional |
| `fileUrl` | `file_url` | TEXT | Required |
| `fileMime` | `file_mime` | VARCHAR(100) | Required |
| `fileSize` | `file_size` | INTEGER | Required (bytes) |
| `mediaId` | `media_id` | TEXT | Supabase media_assets.id |
| `uploadedAt` | `uploaded_at` | TIMESTAMP WITH TIME ZONE | Default NOW() |
| `isRead` | `is_read` | BOOLEAN | Default false |
| `createdAt` | `created_at` | TIMESTAMP WITH TIME ZONE | |
| `updatedAt` | `updated_at` | TIMESTAMP WITH TIME ZONE | |

### Indexes Required
```sql
CREATE INDEX idx_attached_records_patient_id 
  ON attached_records(patient_id);
CREATE INDEX idx_attached_records_consultation_id 
  ON attached_records(consultation_id);
CREATE INDEX idx_attached_records_conversation_id 
  ON attached_records(conversation_id);
```

### Migration Notes
- fileUrl is permanent link (CDN URL or Supabase proxy)
- mediaId links to Supabase media_assets table (for signed URLs)
- type categorizes record (lab result, prescription, imaging, SOAP note, other)
- isRead tracks whether patient has viewed the record
- Soft relationship to consultation/conversation (can exist without)
- fileSize stored for quota tracking
- fileMime used for proper download/display handling

---

## Collection: RiskScore

**MongoDB Model Location:** `lib/models/RiskScore.ts`  
**Total Estimated Records:** 100,000+  
**Migration Complexity:** Medium

### MongoDB Schema
```javascript
{
  _id: ObjectId,
  patientId: ObjectId (ref: User),
  practitionerId: ObjectId (ref: User),
  consultationId: ObjectId (ref: Consultation, optional),
  score: Number (0-100),
  color: String (enum: green|gray|orange|red),
  factors: [String],
  condition: String (optional),
  calculatedAt: Date,
  notes: String (optional),
  createdAt: Date,
  updatedAt: Date
}
```

### PostgreSQL Mapping
| MongoDB Field | PostgreSQL Field | Type | Notes |
|---|---|---|---|
| `_id` | `id` | UUID | |
| `patientId` | `patient_id` | UUID | FK, indexed |
| `practitionerId` | `practitioner_id` | UUID | FK, indexed |
| `consultationId` | `consultation_id` | UUID | FK, optional |
| `score` | `score` | INTEGER | Check 0-100 |
| `color` | `color` | VARCHAR(50) | Check constraint |
| `condition` | `condition` | VARCHAR(255) | Optional |
| `calculatedAt` | `calculated_at` | TIMESTAMP WITH TIME ZONE | |
| `notes` | `notes` | TEXT | Optional |
| `createdAt` | `created_at` | TIMESTAMP WITH TIME ZONE | |
| `updatedAt` | `updated_at` | TIMESTAMP WITH TIME ZONE | |

### Array Fields Normalization
```sql
-- Risk score factors (from factors array)
CREATE TABLE public.risk_score_factors (
  id UUID PRIMARY KEY,
  risk_score_id UUID REFERENCES risk_scores(id) ON DELETE CASCADE,
  factor TEXT NOT NULL
);
```

### Indexes Required
```sql
CREATE INDEX idx_risk_scores_patient_id_date 
  ON risk_scores(patient_id, calculated_at DESC);
CREATE INDEX idx_risk_scores_practitioner_id 
  ON risk_scores(practitioner_id);
```

### Migration Notes
- score is 0-100 integer (could also use NUMERIC(5,2) if percentages with decimals)
- color represents risk level: green (low) → gray (unknown) → orange (elevated) → red (high)
- factors array should be normalized to separate table for individual factor queries
- calculatedAt tracks when AI/clinical algorithm computed the score
- Multiple risk scores per patient over time (one per consultation/assessment)

---

## Relationships Summary

### Foreign Key Dependencies (Insertion Order)

**Order for data insertion to respect foreign key constraints:**

1. `users` (no dependencies)
2. `facilities` (no dependencies)
3. `patients` (depends on users)
4. `patient_profiles` (depends on users)
5. `practitioner_profiles` (depends on users)
6. `hospital_admin_profiles` (depends on users, facilities)
7. `staff` (depends on users, facilities)
8. `consultations` (depends on users, facilities)
9. `conversations` (depends on consultations, users)
10. `calls` (depends on conversations, users)
11. `messages` (depends on conversations, users, attached_records)
12. `attached_records` (depends on consultations, conversations, users)
13. `prescriptions` (depends on users, conversations, messages)
14. `payment_transactions` (depends on users, facilities, consultations)
15. `subscriptions` (depends on users)
16. `payout_requests` (depends on users, facilities)
17. `payment_methods` (depends on users)
18. `audit_logs` (depends on users)
19. `notifications` (depends on users)
20. `risk_scores` (depends on users, consultations)
21. `body_annotations` (depends on users)
22. `anthropometric_records` (depends on users)
23. `medical_context` (depends on users)

### Many-to-Many Join Tables

1. `practitioner_facility_affiliations` (practitioner_id, facility_id)
2. `practitioner_assigned_patients` (practitioner_id, patient_id)
3. `patient_favorite_practitioners` (patient_id, practitioner_id)
4. `patient_my_doctors` (patient_id, practitioner_id)
5. `practitioner_languages` (practitioner_id, language)
6. `practitioner_accepted_medical_aids` (practitioner_id, medical_aid)
7. `practitioner_achievements` (practitioner_id, achievement)
8. `facility_specialties` (facility_id, specialty)
9. `patient_medical_history` (patient_id, condition)
10. `patient_allergies` (patient_id, allergen)
11. `patient_medications` (patient_id, medication)
12. `chronic_conditions` (medical_context_id, condition)
13. `allergies` (medical_context_id, allergen, severity, reaction, source)
14. `current_medications` (medical_context_id, medication)
15. `family_history` (medical_context_id, condition)
16. `schedule_slots` (schedule_id, start_time, end_time, status)
17. `lab_result_parameters` (lab_result_id, param_name, value, unit, reference_range, status)
18. `practitioner_reviews` (practitioner_id, reviewer_id, rating, comment)
19. `risk_score_factors` (risk_score_id, factor)
20. `staff_qualifications` (staff_id, qualification)

---

## Data Type Conversion Reference

### String/Text Conversions
- MongoDB: `String` → PostgreSQL: `VARCHAR(n)` or `TEXT`
  - Use VARCHAR(n) for fixed-size fields (email, phone, role)
  - Use TEXT for variable-length content (description, notes, comments)

### Number Conversions
- MongoDB: `Number` → PostgreSQL depends on purpose:
  - Counts/IDs: `BIGINT` or `INTEGER`
  - Percentages: `NUMERIC(5,2)`
  - Money: `NUMERIC(12,2)` **NEVER FLOAT**
  - Floating point: `REAL` or `DOUBLE PRECISION`

### Date Conversions
- MongoDB: `Date` → PostgreSQL: `TIMESTAMP WITH TIME ZONE`
  - Always assume MongoDB dates are UTC
  - Always store as UTC in PostgreSQL
  - Use `DEFAULT NOW()` for auto-timestamps

### ObjectId Conversions
- MongoDB: `ObjectId` → PostgreSQL: `UUID`
  - Conversion: `ObjectId.toString()` → hexadecimal string → `uuid_generate_v5('ns_oid', hex_string)`
  - Or use `gen_random_uuid()` for new records

### Array Conversions
- MongoDB: `[String]` → PostgreSQL Options:
  1. **JSONB**: `JSONB DEFAULT '[]'` for simple arrays
  2. **Separate Table**: For queryable individual items
  3. **TEXT[]**: For PostgreSQL native array type (less flexible)

### Nested Object Conversions
- MongoDB: `{key: value, ...}` → PostgreSQL Options:
  1. **JSONB**: For flexible/unstructured objects
  2. **Separate Table**: For frequently-queried nested data
  3. **Denormalized Columns**: For small, fixed-structure objects

---

## Validation Rules for Migration

### Field-Level Validation

```sql
-- Check emails are valid
SELECT email FROM users WHERE email NOT LIKE '%@%';

-- Check numeric fields are within range
SELECT * FROM consultations WHERE call_minutes_used < 0;

-- Check enum values
SELECT DISTINCT role FROM users ORDER BY role;

-- Check dates are reasonable (not in future or way past)
SELECT * FROM users WHERE created_at > NOW() OR created_at < '2020-01-01';

-- Check foreign keys
SELECT c.id FROM consultations c 
LEFT JOIN users u ON c.patient_id = u.id 
WHERE u.id IS NULL;
```

### Consistency Validation

```sql
-- Verify row counts match
SELECT COUNT(*) as mongo_user_count FROM users;  -- Should match MongoDB count

-- Verify no NULL in required fields
SELECT COUNT(*) FROM users WHERE email IS NULL;  -- Should be 0

-- Verify UNIQUE constraints
SELECT email, COUNT(*) FROM users GROUP BY email HAVING COUNT(*) > 1;  -- Should be 0

-- Verify date ordering (created_at <= updated_at)
SELECT * FROM consultations WHERE created_at > updated_at;  -- Should be 0 rows
```

---

## End of Document

**Total Collections Mapped:** 27+ primary + 20+ junction tables  
**Total Fields:** 300+  
**Migration Complexity:** High  
**Estimated Migration Time:** 2-3 weeks for initial load, 4+ weeks for full cutover

**Last Updated:** 2026-08-08  
**Version:** 1.0
