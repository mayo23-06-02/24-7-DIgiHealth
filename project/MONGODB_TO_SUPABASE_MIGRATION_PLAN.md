# MongoDB to Supabase (PostgreSQL) Migration Plan
## 24-7 DigiHealth Platform

**Document Version:** 1.0  
**Created:** 2026-08-08  
**Target Migration Timeline:** 16-20 weeks  
**Status:** Migration Planning Phase

---

## Executive Summary

The 24-7 DigiHealth platform is currently built on MongoDB using Mongoose ODM for data persistence. This document outlines a comprehensive strategy to migrate all application data from MongoDB (Atlas) to Supabase (PostgreSQL) while maintaining system availability and data integrity.

**Key Drivers for Migration:**
- Improved relational data modeling for healthcare domain
- Better transaction support and ACID compliance
- Lower operating costs with Supabase's PostgreSQL infrastructure
- Leverage existing Supabase integration (currently partial)
- Enhanced security with Row-Level Security (RLS) policies
- Native real-time capabilities via Supabase webhooks/extensions

**Scope:** Complete data migration across 27+ collections to PostgreSQL tables, code refactoring to remove Mongoose, integration with Supabase client libraries, and deployment of new infrastructure.

**Estimated Effort:** 120-160 developer days across 4-5 months

---

## Section 1: Current State Analysis

### 1.1 MongoDB Configuration

**Current Setup:**
- **Connection Method:** Mongoose ODM + Native MongoDB driver
- **Database URI:** MongoDB Atlas (production cluster)
- **Connection Files:**
  - `lib/mongodb.ts` - Mongoose connection with caching
  - `lib/mongodb-client.ts` - Native MongoDB driver connection
  - Both methods exist; Mongoose is primary

**Environment Configuration:**
```
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/digihealth?...
JWT_SECRET=secret_key
```

### 1.2 MongoDB Collections Overview

**Total Collections:** 27 primary collections across multiple schemas

#### Core Identity & Access
1. **User** (40,000+ projected records)
   - Email, password, role, status
   - Supabase UID integration (partially)
   - Indexes: email (unique), role, phoneE164, supabaseUid
   - Relationships: References in Patient, Practitioner, Staff models

2. **Patient** (15,000+ projected)
   - User reference, DOB, gender, medical history
   - Emergency contact (embedded)
   - Indexes: userId (unique)

3. **PatientProfile** (mirrors Patient, from RoleProfiles)
   - Alternative patient data structure
   - Medical aid info, subscription tier
   - Favorite/assigned practitioners

4. **PractitionerProfile** (3,000+ estimated)
   - Specialization, HPCSA number, ratings
   - Bank account details (embedded)
   - Affiliated facilities (many-to-many)

5. **HospitalAdminProfile** (500+ estimated)
   - Hospital assignment, department, permissions

6. **Staff** (5,000+ estimated)
   - Facility assignment, role, shift schedule
   - Hourly rate, qualifications array

#### Consultations & Appointments
7. **Consultation** (100,000+ projected)
   - Patient ↔ Practitioner relationships
   - Status tracking (requested, pending, scheduled, completed, cancelled, missed)
   - SOAP notes embedded
   - Clinical risk assessment
   - Pending reschedule tracking
   - Indexes: (patientId, scheduledStartTime), (practitionerId, scheduledStartTime)

8. **HospitalAppointment** (50,000+ projected)
   - Facility, patient, practitioner, type
   - Scheduled time windows
   - Room assignment

9. **Call** (50,000+ projected)
   - Consultation/Conversation reference
   - Video/voice type
   - LiveKit integration (room name/URL)
   - Duration tracking

10. **Conversation** (50,000+ projected)
    - Patient ↔ Practitioner messaging context
    - Minutes allocation/usage tracking
    - Status tracking
    - Unique constraint: consultationId (sparse)

11. **Scheduling** (10,000+ projected)
    - Practitioner schedules
    - Date-based with time slots
    - Recurring patterns

#### Messaging & Communications
12. **Message** (500,000+ projected)
    - ConversationId reference (required)
    - SenderId, ReceiverId
    - Multiple types: text, image, file, audio, quick_phrase, record_attachment, call_log
    - Read/delivery tracking
    - Idempotent key for Ably integration (clientId)
    - Indexes: (clientId, conversationId) unique sparse, (conversationId, createdAt)

13. **Notification** (200,000+ projected)
    - User notifications
    - Multiple delivery channels
    - Read status tracking

#### Health Records & Clinical Data
14. **Anthropometric** (100,000+ projected)
    - Height, weight, BMI, blood type
    - Vital signs (systolic/diastolic BP, heart rate, SpO2, temperature)
    - Date recorded tracking
    - Indexes: (patientId, dateRecorded)

15. **MedicalContext** (15,000 unique)
    - Chronic conditions array
    - Allergies (with severity and reaction)
    - Current medications array
    - Family history array
    - Unique: one per patient

16. **Prescription** (50,000+ projected)
    - Patient-practitioner prescription
    - Medication details, dosage, instructions
    - Refills tracking
    - Document URL/MIME (formal script)
    - References: Conversation, Message
    - Indexes: (patientId, prescribedDate)

17. **LabResult** (50,000+ projected)
    - Test name, date reported
    - Nested parameters (name, value, unit, reference range, status)

18. **Immunization** (30,000+ projected)
    - Vaccine name, date administered
    - Batch/dose tracking
    - Next due date

19. **RiskScore** (100,000+ projected)
    - Patient-Practitioner risk assessment
    - Score (0-100), color coded (green/gray/orange/red)
    - Factors array, optional condition
    - Indexes: (patientId, calculatedAt), (practitionerId)

20. **BodyAnnotation** (10,000+ projected)
    - Patient body mapping
    - X, Y, Z coordinates
    - Part description
    - Index: patientId

21. **AttachedRecord** (100,000+ projected)
    - Lab results, prescriptions, imaging, SOAP notes
    - File metadata (URL, MIME, size)
    - Media ID (Supabase reference)
    - Upload tracking, read status
    - Soft relationship to Consultation/Conversation

#### Billing & Payments
22. **PaymentTransaction** (200,000+ projected)
    - Patient payments for services
    - Amount, currency (ZAR), provider
    - Status: pending, completed, failed, refunded
    - Category: service_booking, subscription, procedure, pharmacy, lab
    - Platform fee tracking, practitioner earnings
    - Medical aid claim tracking
    - Indexes: (patientId, timestamp)

23. **Subscription** (15,000+ projected)
    - Tier: free, pro, family
    - Status: active, trial, cancelled, past_due
    - Auto-renewal, billing dates
    - Price tracking

24. **PayoutRequest** (5,000+ projected)
    - Practitioner → Platform payout tracking
    - Status: pending, approved, paid, rejected
    - Bank account details (embedded)
    - Period-based accounting (periodFrom, periodTo)
    - Consultation count, platform fee

25. **PaymentMethod** (20,000+ projected)
    - Saved cards, medical aid, EFT
    - Card brand, last4, expiry
    - Medical aid provider/number
    - Bank details
    - Insurance policy info

26. **PlatformFeeConfig** (singleton)
    - Platform and subscription fee percentages
    - Configuration audit trail

27. **HospitalRevenue** (analytics)
    - Daily/monthly/yearly aggregates
    - Revenue by department
    - Payout tracking

#### Facilities & Infrastructure
28. **Facility** (500+ projected)
    - Hospital/clinic information
    - Address with coordinates (2D sphere index)
    - Bed capacity tracking
    - Wait times, emergency services flag
    - Contact info

#### Logging & Auditing
29. **AuditLog** (500,000+ projected)
    - Action tracking across platform
    - Actor info, target, action type
    - Metadata (flexible)
    - Indexes: (actorId, createdAt), (action), (createdAt)

#### System Configuration
30. **SystemConfig** (singleton)
    - Feature flags
    - Maintenance mode
    - POPIA version tracking
    - Default consultation fee
    - Emergency numbers, languages

31. **OfflineActionQueue** (temporary)
    - User offline actions queue
    - Action type, payload
    - Retry tracking, sync status

#### Additional Models
32. **HealthTip** - Articles/tips content
33. **Article** - Editorial content
34. **ReviewsDocs** - User reviews/documentation
35. **PatientEvent** - Patient timeline events
36. **AIDecision** - AI diagnosis decisions
37. **BedOccupancy** - Real-time bed tracking
38. **HospitalTransaction** - Hospital-level transactions

### 1.3 Key Indexes & Constraints

**Unique Constraints:**
- User.email (case-insensitive, trimmed)
- User.saId (sparse)
- User.supabaseUid (sparse)
- Patient.userId
- PatientProfile.userId
- PractitionerProfile.userId
- HospitalAdminProfile.userId
- MedicalContext.patientId
- Conversation.consultationId (sparse)
- Message.clientId + conversationId (sparse, for idempotency)

**Compound Indexes:**
- Consultation: (patientId, scheduledStartTime DESC), (practitionerId, scheduledStartTime DESC)
- Anthropometric: (patientId, dateRecorded DESC)
- Prescription: (patientId, prescribedDate DESC)
- RiskScore: (patientId, calculatedAt DESC), (practitionerId)
- Message: (clientId, conversationId) unique sparse, (conversationId, createdAt DESC)
- AuditLog: (actorId, createdAt DESC), (action), (createdAt DESC)

**Spatial Indexes:**
- Facility.address.coordinates (2dsphere for geo queries)

### 1.4 Data Relationships Map

```
User (core)
├── Patient (one-to-one via userId)
│   ├── Consultation (one-to-many via userId as patientId)
│   │   ├── Conversation (one-to-one via consultationId)
│   │   │   ├── Message (one-to-many via conversationId)
│   │   │   └── Call (one-to-many via conversationId)
│   │   └── SOAP Notes (embedded)
│   ├── MedicalContext (one-to-one via userId)
│   ├── Anthropometric (one-to-many via userId)
│   ├── Prescription (one-to-many via userId as patientId)
│   ├── LabResult (one-to-many via userId as patientId)
│   ├── Immunization (one-to-many via userId)
│   ├── RiskScore (one-to-many via userId as patientId)
│   ├── BodyAnnotation (one-to-many via userId)
│   ├── PaymentTransaction (one-to-many via userId as patientId)
│   ├── Subscription (one-to-one via userId)
│   └── AttachedRecord (one-to-many via userId as patientId)
├── PractitionerProfile (one-to-one via userId)
│   ├── Consultation (one-to-many via userId as practitionerId)
│   ├── Conversation (one-to-many via userId as practitionerId)
│   ├── RiskScore (one-to-many via userId as practitionerId)
│   ├── Prescription (one-to-many via userId as practitionerId)
│   ├── PractitionerSchedule (one-to-many via userId)
│   └── PayoutRequest (one-to-many via userId)
├── HospitalAdminProfile (one-to-one via userId)
└── Staff (zero-to-many via userId)

Facility
├── Staff (one-to-many)
├── HospitalAppointment (one-to-many)
└── PractitionerProfile.affiliatedFacilityIds (many-to-many)
```

### 1.5 MongoDB-Specific Features Currently Used

1. **Sparse Indexes** - Used for optional unique fields (supabaseUid, saId, phoneE164)
2. **Compound Indexes** - Multi-field sorting (patientId + createdAt)
3. **2dsphere Index** - Geographic queries on facility coordinates
4. **Flexible Schema** - Some mixed types (Schema.Types.Mixed)
5. **Nested Documents** - Embedded objects (emergencyContact, bankAccount, vitalSigns, clinicalRisk)
6. **Array Fields** - Lists and array operations (allergies, medications, achievements)
7. **Timestamps** - Automatic createdAt/updatedAt (Mongoose plugin)

**No Heavy MongoDB-Specific Features Used:**
- No aggregation pipelines with complex stages
- No transactions (atomic multi-document operations)
- No sharding required (data fits single database)

### 1.6 Current API Integration Patterns

**Total Affected Routes:** 117 API endpoints using connectToDatabase()

**Common Patterns:**
1. **Query & Response** (70% of routes)
   ```typescript
   await Model.find({condition}).populate('reference').lean()
   ```

2. **CRUD Operations** (20% of routes)
   ```typescript
   await Model.updateOne({_id}, {$set: {field: value}})
   ```

3. **Filtering & Sorting** (10% of routes)
   ```typescript
   await Model.find().sort({field: -1}).limit(10)
   ```

**NextAuth Integration:**
- Currently using `@auth/mongodb-adapter`
- Will need to switch to SQL adapter or custom implementation

---

## Section 2: Supabase/PostgreSQL Mapping

### 2.1 MongoDB to PostgreSQL Data Type Mapping

| MongoDB Type | PostgreSQL Type | Notes |
|---|---|---|
| ObjectId | UUID | Primary keys; use uuid_generate_v4() |
| String | TEXT/VARCHAR(n) | Use TEXT for flexible lengths |
| Number | INTEGER/BIGINT/NUMERIC | BIGINT for ID references, NUMERIC for financial |
| Boolean | BOOLEAN | Direct mapping |
| Date | TIMESTAMP WITH TIME ZONE | Always UTC |
| Array (homogeneous) | JSONB or Foreign table | See array mapping below |
| Nested Object | JSONB | Store as JSON when < 5 fields, normalize if > 5 |
| Binary | BYTEA | For file content (prefer external storage) |
| Geo coordinates | GEOGRAPHY | Use PostGIS extension |
| Null | NULL | Same handling |
| Mixed (flexible) | JSONB | Last resort for unstructured data |

### 2.2 Array & Relationship Mapping Strategy

**Strategy 1: JSONB Arrays (Keep Normalized)**
Use for: Small, immutable lists (languages, specialties, allergies)
```sql
-- Instead of MongoDB: allergies: [{allergen, severity, reaction, source}]
CREATE TABLE patient_allergies (
  id UUID PRIMARY KEY,
  patient_id UUID REFERENCES users(id),
  allergen TEXT NOT NULL,
  severity VARCHAR(20) NOT NULL,
  reaction TEXT,
  source VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Strategy 2: JSONB Columns (For Complex Nested)**
Use for: Embedded objects that don't need individual querying
```sql
-- MongoDB: emergencyContact: {name, phone, relationship}
ALTER TABLE patients ADD COLUMN emergency_contact JSONB;
```

**Strategy 3: Separate Tables (For Many-to-Many)**
Use for: Practitioner → Facilities (affiliatedFacilityIds)
```sql
CREATE TABLE practitioner_facility_affiliations (
  id UUID PRIMARY KEY,
  practitioner_id UUID REFERENCES users(id),
  facility_id UUID REFERENCES facilities(id),
  UNIQUE(practitioner_id, facility_id)
);
```

### 2.3 Complete PostgreSQL Schema

#### Authentication & Users

```sql
-- Core user authentication (Supabase auth.users via auth schema)
-- We'll sync/reference this table for app-level metadata

CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  email_verified BOOLEAN DEFAULT false,
  email_verified_at TIMESTAMP WITH TIME ZONE,
  password_hash VARCHAR(255),  -- Null if OTP only
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  phone_e164 VARCHAR(20) UNIQUE SPARSE,
  mobile VARCHAR(20),
  sa_id VARCHAR(13) UNIQUE SPARSE,  -- South African ID
  mfa_enabled BOOLEAN DEFAULT false,
  supabase_uid UUID UNIQUE SPARSE,  -- Reference to auth.users
  role VARCHAR(50) NOT NULL DEFAULT 'patient',  -- patient|practitioner|hospital_admin|inspector|super_admin|mega_admin
  status VARCHAR(50) DEFAULT 'active',  -- active|suspended|pending_verification
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_role CHECK (role IN ('patient', 'practitioner', 'hospital_admin', 'inspector', 'super_admin', 'mega_admin')),
  CONSTRAINT valid_status CHECK (status IN ('active', 'suspended', 'pending_verification'))
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_phone_e164 ON users(phone_e164) WHERE phone_e164 IS NOT NULL;
CREATE INDEX idx_users_supabase_uid ON users(supabase_uid) WHERE supabase_uid IS NOT NULL;
CREATE INDEX idx_users_sa_id ON users(sa_id) WHERE sa_id IS NOT NULL;
```

#### Patient Records

```sql
CREATE TABLE public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  date_of_birth DATE NOT NULL,
  gender VARCHAR(20) NOT NULL,
  mobile_number VARCHAR(20) NOT NULL,
  blood_type VARCHAR(5),
  emergency_contact JSONB NOT NULL DEFAULT '{}',  -- {name, phone, relationship}
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_gender CHECK (gender IN ('male', 'female', 'other'))
);

CREATE INDEX idx_patients_user_id ON patients(user_id);

-- Medical history as separate table
CREATE TABLE public.patient_medical_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  condition TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_patient_medical_history ON patient_medical_history(patient_id);
```

#### Patient Profiles (Denormalized view of Patient)

```sql
CREATE TABLE public.patient_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  date_of_birth DATE NOT NULL,
  gender VARCHAR(20) NOT NULL,
  emergency_contact JSONB,  -- {name, phone, relationship}
  medical_aid JSONB,  -- {provider, planName, memberNumber}
  subscription_tier VARCHAR(50) DEFAULT 'free',  -- free|pro|family
  popia_consent_date TIMESTAMP WITH TIME ZONE,
  profile_photo TEXT,  -- URL
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_patient_profiles_user_id ON patient_profiles(user_id);
```

#### Practitioners

```sql
CREATE TABLE public.practitioner_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  specialisation VARCHAR(255) NOT NULL,
  hpcsa_number VARCHAR(50) NOT NULL UNIQUE,
  experience_years INTEGER,
  bio TEXT,
  rating NUMERIC(3, 2) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  is_online BOOLEAN DEFAULT false,
  profile_photo TEXT,  -- URL
  hpcsa_certificate TEXT,  -- URL
  bank_account JSONB NOT NULL,  -- {accountHolder, bankName, accountNumber, branchCode, taxNumber}
  address JSONB,  -- {street, city, province}
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_practitioner_profiles_user_id ON practitioner_profiles(user_id);
CREATE INDEX idx_practitioner_profiles_hpcsa ON practitioner_profiles(hpcsa_number);
CREATE INDEX idx_practitioner_profiles_specialisation ON practitioner_profiles(specialisation);

-- Practitioner specialties/languages/achievements (array tables)
CREATE TABLE public.practitioner_languages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID NOT NULL REFERENCES practitioner_profiles(id) ON DELETE CASCADE,
  language VARCHAR(255) NOT NULL,
  UNIQUE(practitioner_id, language)
);

CREATE TABLE public.practitioner_accepted_medical_aids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID NOT NULL REFERENCES practitioner_profiles(id) ON DELETE CASCADE,
  medical_aid VARCHAR(255) NOT NULL,
  UNIQUE(practitioner_id, medical_aid)
);

CREATE TABLE public.practitioner_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID NOT NULL REFERENCES practitioner_profiles(id) ON DELETE CASCADE,
  achievement TEXT NOT NULL
);

CREATE TABLE public.practitioner_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID NOT NULL REFERENCES practitioner_profiles(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES users(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT rating_check CHECK (rating >= 1 AND rating <= 5)
);

CREATE INDEX idx_practitioner_reviews_practitioner_id ON practitioner_reviews(practitioner_id);
```

#### Facilities

```sql
CREATE TABLE public.facilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  facility_type VARCHAR(50),  -- Public|Private|NGO
  street VARCHAR(255),
  city VARCHAR(255) NOT NULL,
  province VARCHAR(255) NOT NULL,
  coordinates GEOGRAPHY(POINT, 4326),  -- PostGIS for geo queries
  phone VARCHAR(20),
  emergency_phone VARCHAR(20),
  email VARCHAR(255),
  bed_capacity_total INTEGER,
  bed_capacity_general_available INTEGER,
  bed_capacity_icu_available INTEGER,
  current_wait_time_mins INTEGER DEFAULT 0,
  is_open BOOLEAN DEFAULT true,
  emergency_services BOOLEAN DEFAULT false,
  logo TEXT,  -- URL
  wallpaper TEXT,  -- URL
  reg_certificate TEXT,  -- URL
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_facilities_coordinates ON facilities USING GIST(coordinates);
CREATE INDEX idx_facilities_city_province ON facilities(city, province);

-- Facility specialties
CREATE TABLE public.facility_specialties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  specialty VARCHAR(255) NOT NULL,
  UNIQUE(facility_id, specialty)
);
```

#### Hospital Admin Profiles

```sql
CREATE TABLE public.hospital_admin_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  hospital_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  department VARCHAR(255),
  permissions JSONB DEFAULT '[]',  -- Array of permission strings
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_hospital_admin_profiles_user_id ON hospital_admin_profiles(user_id);
CREATE INDEX idx_hospital_admin_profiles_hospital_id ON hospital_admin_profiles(hospital_id);
```

#### Staff

```sql
CREATE TABLE public.staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL,  -- doctor|nurse|admin|technician
  department VARCHAR(255) NOT NULL,
  shift_start TIME NOT NULL,
  shift_end TIME NOT NULL,
  shift_days JSONB DEFAULT '[]',  -- Array of integers (0-6 for days of week)
  is_on_duty BOOLEAN DEFAULT false,
  hourly_rate NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_role CHECK (role IN ('doctor', 'nurse', 'admin', 'technician'))
);

CREATE INDEX idx_staff_facility_id ON staff(facility_id);
CREATE INDEX idx_staff_user_id ON staff(user_id);

-- Staff qualifications
CREATE TABLE public.staff_qualifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  qualification TEXT NOT NULL
);
```

#### Consultations & Appointments

```sql
CREATE TABLE public.consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  practitioner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  facility_id UUID REFERENCES facilities(id) ON DELETE SET NULL,
  type VARCHAR(50) NOT NULL,  -- video|chat|in_person
  status VARCHAR(50) DEFAULT 'requested',
  scheduled_start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  scheduled_end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  chief_complaint TEXT,
  clinical_risk JSONB,  -- {score, color, factors}
  soap_notes JSONB,  -- {subjective, objective, assessment, plan, signedAt}
  call_minutes_used INTEGER DEFAULT 0,
  source VARCHAR(50),  -- patient_self_serve|practitioner_schedule|hospital_desk|system
  requested_to UUID REFERENCES users(id) ON DELETE SET NULL,
  pending_reschedule JSONB,  -- {proposedStart, proposedEnd, proposedBy, proposedAt}
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_type CHECK (type IN ('video', 'chat', 'in_person')),
  CONSTRAINT valid_status CHECK (status IN ('requested', 'pending', 'scheduled', 'in_progress', 'completed', 'cancelled', 'missed'))
);

CREATE INDEX idx_consultations_patient_id_scheduled ON consultations(patient_id, scheduled_start_time DESC);
CREATE INDEX idx_consultations_practitioner_id_scheduled ON consultations(practitioner_id, scheduled_start_time DESC);
CREATE INDEX idx_consultations_status ON consultations(status);
```

#### Hospital Appointments

```sql
CREATE TABLE public.hospital_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  practitioner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,  -- consultation|procedure|lab
  scheduled_start TIMESTAMP WITH TIME ZONE NOT NULL,
  scheduled_end TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(50) DEFAULT 'scheduled',
  room VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_type CHECK (type IN ('consultation', 'procedure', 'lab')),
  CONSTRAINT valid_status CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled'))
);

CREATE INDEX idx_hospital_appointments_facility_id ON hospital_appointments(facility_id);
CREATE INDEX idx_hospital_appointments_patient_id ON hospital_appointments(patient_id);
```

#### Conversations & Messaging

```sql
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id UUID UNIQUE REFERENCES consultations(id) ON DELETE SET NULL,
  patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  practitioner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'active',  -- active|ended|pending
  minutes_allocated INTEGER NOT NULL,
  minutes_used INTEGER DEFAULT 0,
  minutes_requested INTEGER DEFAULT 0,
  minutes_approved INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_status CHECK (status IN ('active', 'ended', 'pending'))
);

CREATE INDEX idx_conversations_patient_id ON conversations(patient_id);
CREATE INDEX idx_conversations_practitioner_id ON conversations(practitioner_id);
CREATE INDEX idx_conversations_consultation_id ON conversations(consultation_id);

CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT,
  type VARCHAR(50) DEFAULT 'text',  -- text|image|file|audio|quick_phrase|record_attachment|call_log
  file_url TEXT,
  file_mime VARCHAR(100),
  media_id TEXT,  -- Supabase media_assets.id
  record_id UUID REFERENCES attached_records(id),
  client_id VARCHAR(255),  -- For idempotent operations (Ably)
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_type CHECK (type IN ('text', 'image', 'file', 'audio', 'quick_phrase', 'record_attachment', 'call_log'))
);

CREATE INDEX idx_messages_conversation_id_created ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_receiver_id ON messages(receiver_id);
CREATE UNIQUE INDEX idx_messages_idempotent ON messages(client_id, conversation_id) WHERE client_id IS NOT NULL;
```

#### Calls

```sql
CREATE TABLE public.calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id UUID REFERENCES consultations(id) ON DELETE SET NULL,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  initiated_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER DEFAULT 0,
  type VARCHAR(50) NOT NULL,  -- video|voice
  status VARCHAR(50) DEFAULT 'active',
  livekit_room_name VARCHAR(255),
  livekit_room_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_type CHECK (type IN ('video', 'voice')),
  CONSTRAINT valid_status CHECK (status IN ('requested', 'active', 'ended', 'missed', 'declined'))
);

CREATE INDEX idx_calls_conversation_id ON calls(conversation_id);
CREATE INDEX idx_calls_initiated_by ON calls(initiated_by);
```

#### Scheduling

```sql
CREATE TABLE public.practitioner_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date_scheduled DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(practitioner_id, date_scheduled)
);

CREATE TABLE public.schedule_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES practitioner_schedules(id) ON DELETE CASCADE,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status VARCHAR(50) DEFAULT 'available',  -- available|booked|blocked
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_schedule_slots_schedule_id ON schedule_slots(schedule_id);
```

#### Clinical Data

```sql
CREATE TABLE public.anthropometric_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date_recorded TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  height_cm NUMERIC(6, 2),
  weight_kg NUMERIC(6, 2),
  bmi NUMERIC(6, 2),
  blood_type VARCHAR(10),
  systolic_bp INTEGER,
  diastolic_bp INTEGER,
  heart_rate_bpm INTEGER,
  spo2 NUMERIC(5, 2),
  temperature_celsius NUMERIC(5, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_anthropometric_patient_id_date ON anthropometric_records(patient_id, date_recorded DESC);

CREATE TABLE public.medical_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.chronic_conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medical_context_id UUID NOT NULL REFERENCES medical_context(id) ON DELETE CASCADE,
  condition TEXT NOT NULL
);

CREATE TABLE public.allergies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medical_context_id UUID NOT NULL REFERENCES medical_context(id) ON DELETE CASCADE,
  allergen TEXT NOT NULL,
  severity VARCHAR(50),  -- mild|moderate|severe
  reaction TEXT,
  source VARCHAR(50),  -- patient|clinician
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.current_medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medical_context_id UUID NOT NULL REFERENCES medical_context(id) ON DELETE CASCADE,
  medication TEXT NOT NULL
);

CREATE TABLE public.family_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medical_context_id UUID NOT NULL REFERENCES medical_context(id) ON DELETE CASCADE,
  condition TEXT NOT NULL
);

CREATE TABLE public.prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  practitioner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  medication_name VARCHAR(255) NOT NULL,
  dosage VARCHAR(255),
  instructions TEXT,
  status VARCHAR(50) DEFAULT 'active',  -- active|completed|discontinued
  prescribed_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  refills_remaining INTEGER DEFAULT 0,
  document_url TEXT,
  document_mime VARCHAR(100),
  document_name VARCHAR(255),
  media_id TEXT,
  conversation_id UUID REFERENCES conversations(id),
  message_id UUID REFERENCES messages(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_status CHECK (status IN ('active', 'completed', 'discontinued'))
);

CREATE INDEX idx_prescriptions_patient_id_date ON prescriptions(patient_id, prescribed_date DESC);
CREATE INDEX idx_prescriptions_practitioner_id ON prescriptions(practitioner_id);

CREATE TABLE public.lab_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ordered_by UUID REFERENCES users(id) ON DELETE SET NULL,
  test_name VARCHAR(255) NOT NULL,
  date_reported TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.lab_result_parameters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_result_id UUID NOT NULL REFERENCES lab_results(id) ON DELETE CASCADE,
  param_name VARCHAR(255) NOT NULL,
  value VARCHAR(255) NOT NULL,
  unit VARCHAR(100),
  reference_range VARCHAR(100),
  status VARCHAR(50)  -- normal|high|low
);

CREATE TABLE public.immunizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vaccine_name VARCHAR(255) NOT NULL,
  date_administered TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  dosage VARCHAR(100),
  batch_number VARCHAR(255),
  administered_by VARCHAR(255),
  next_due_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_immunizations_patient_id ON immunizations(patient_id);
```

#### Risk Scoring

```sql
CREATE TABLE public.risk_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  practitioner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  consultation_id UUID REFERENCES consultations(id) ON DELETE SET NULL,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  color VARCHAR(50) NOT NULL,  -- green|gray|orange|red
  condition VARCHAR(255),
  notes TEXT,
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_risk_scores_patient_id_date ON risk_scores(patient_id, calculated_at DESC);
CREATE INDEX idx_risk_scores_practitioner_id ON risk_scores(practitioner_id);

CREATE TABLE public.risk_score_factors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_score_id UUID NOT NULL REFERENCES risk_scores(id) ON DELETE CASCADE,
  factor TEXT NOT NULL
);
```

#### Health Records

```sql
CREATE TABLE public.attached_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id UUID REFERENCES consultations(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  practitioner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  type VARCHAR(50) NOT NULL,  -- lab_result|prescription|imaging|soap_note|other
  title VARCHAR(255) NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_mime VARCHAR(100) NOT NULL,
  file_size INTEGER NOT NULL,
  media_id TEXT,  -- Supabase media_assets.id
  is_read BOOLEAN DEFAULT false,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_type CHECK (type IN ('lab_result', 'prescription', 'imaging', 'soap_note', 'other'))
);

CREATE INDEX idx_attached_records_patient_id ON attached_records(patient_id);
CREATE INDEX idx_attached_records_consultation_id ON attached_records(consultation_id);
CREATE INDEX idx_attached_records_conversation_id ON attached_records(conversation_id);

CREATE TABLE public.body_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  part VARCHAR(255) DEFAULT 'Surface Mapping',
  x_coordinate NUMERIC(10, 4) NOT NULL,
  y_coordinate NUMERIC(10, 4) NOT NULL,
  z_coordinate NUMERIC(10, 4) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_body_annotations_patient_id ON body_annotations(patient_id);
```

#### Billing & Payments

```sql
CREATE TABLE public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES users(id) ON DELETE CASCADE,
  practitioner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  facility_id UUID REFERENCES facilities(id) ON DELETE SET NULL,
  consultation_id UUID REFERENCES consultations(id) ON DELETE SET NULL,
  amount NUMERIC(12, 2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'ZAR',
  provider VARCHAR(50) NOT NULL,  -- medical_aid|card|eft|cash|wallet
  status VARCHAR(50) DEFAULT 'pending',  -- pending|completed|failed|refunded
  description TEXT,
  category VARCHAR(50),  -- service_booking|subscription|procedure|pharmacy|lab
  provider_transaction_id VARCHAR(255),
  receipt_url TEXT,
  medical_aid_claim_ref VARCHAR(255),
  platform_fee_amount NUMERIC(12, 2),
  practitioner_earnings NUMERIC(12, 2),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_provider CHECK (provider IN ('medical_aid', 'card', 'eft', 'cash', 'wallet')),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'completed', 'failed', 'refunded'))
);

CREATE INDEX idx_payment_transactions_patient_id ON payment_transactions(patient_id);
CREATE INDEX idx_payment_transactions_timestamp ON payment_transactions(timestamp DESC);

CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tier VARCHAR(50) DEFAULT 'free',  -- free|pro|family
  status VARCHAR(50) NOT NULL,  -- active|trial|cancelled|past_due
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  next_billing_date TIMESTAMP WITH TIME ZONE,
  payment_method_id VARCHAR(255),
  auto_renew BOOLEAN DEFAULT true,
  price NUMERIC(10, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_tier CHECK (tier IN ('free', 'pro', 'family')),
  CONSTRAINT valid_status CHECK (status IN ('active', 'trial', 'cancelled', 'past_due'))
);

CREATE INDEX idx_subscriptions_patient_id ON subscriptions(patient_id);

CREATE TABLE public.payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,  -- card|medical_aid|eft
  is_default BOOLEAN DEFAULT false,
  card_brand VARCHAR(50),
  last4 VARCHAR(4),
  expiry_month INTEGER,
  expiry_year INTEGER,
  medical_aid_provider VARCHAR(255),
  medical_aid_number VARCHAR(255),
  bank_name VARCHAR(255),
  account_number VARCHAR(255),
  branch_code VARCHAR(20),
  insurance_provider VARCHAR(255),
  policy_number VARCHAR(255),
  coverage_type VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_type CHECK (type IN ('card', 'medical_aid', 'eft'))
);

CREATE INDEX idx_payment_methods_patient_id ON payment_methods(patient_id);

CREATE TABLE public.payout_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  facility_id UUID REFERENCES facilities(id) ON DELETE SET NULL,
  amount NUMERIC(12, 2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'ZAR',
  status VARCHAR(50) DEFAULT 'pending',  -- pending|approved|paid|rejected
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  account_holder VARCHAR(255) NOT NULL,
  bank_name VARCHAR(255) NOT NULL,
  account_number VARCHAR(255) NOT NULL,
  branch_code VARCHAR(20) NOT NULL,
  period_from TIMESTAMP WITH TIME ZONE NOT NULL,
  period_to TIMESTAMP WITH TIME ZONE NOT NULL,
  consultation_count INTEGER,
  platform_fee_deducted NUMERIC(12, 2),
  notes TEXT,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'approved', 'paid', 'rejected'))
);

CREATE INDEX idx_payout_requests_practitioner_id ON payout_requests(practitioner_id);

CREATE TABLE public.platform_fee_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_fee_percent NUMERIC(5, 2) DEFAULT 15,
  subscription_fee_percent NUMERIC(5, 2) DEFAULT 10,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.hospital_revenue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  period VARCHAR(50),  -- daily|monthly|yearly
  date_period DATE NOT NULL,
  total_revenue NUMERIC(12, 2),
  pending_payouts NUMERIC(12, 2),
  completed_payouts NUMERIC(12, 2),
  net_revenue NUMERIC(12, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_hospital_revenue_facility_id_date ON hospital_revenue(facility_id, date_period DESC);
```

#### Logging & Auditing

```sql
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_role VARCHAR(50) NOT NULL,
  actor_email VARCHAR(255),
  action VARCHAR(255) NOT NULL,
  target_type VARCHAR(50),
  target_id TEXT,
  metadata JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_action CHECK (action != '')
);

CREATE INDEX idx_audit_logs_actor_id_date ON audit_logs(actor_id, created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_target_type_id ON audit_logs(target_type, target_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
```

#### Notifications

```sql
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255),
  body TEXT,
  data JSONB,
  is_read BOOLEAN DEFAULT false,
  delivered_via JSONB DEFAULT '[]',  -- Array of delivery methods
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id_read ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_user_id_created ON notifications(user_id, created_at DESC);
```

#### System & Configuration

```sql
CREATE TABLE public.system_config (
  id VARCHAR(50) PRIMARY KEY DEFAULT 'singleton',
  features JSONB DEFAULT '{}',
  maintenance_mode BOOLEAN DEFAULT false,
  popia_version VARCHAR(50),
  consultation_fee_default NUMERIC(10, 2),
  emergency_numbers JSONB DEFAULT '[]',
  supported_languages JSONB DEFAULT '[]',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.offline_action_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(255) NOT NULL,
  payload JSONB,
  retry_count INTEGER DEFAULT 0,
  last_attempt TIMESTAMP WITH TIME ZONE,
  synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_offline_action_queue_user_id ON offline_action_queue(user_id);
```

#### Many-to-Many Relationships

```sql
-- Practitioner affiliated facilities
CREATE TABLE public.practitioner_facility_affiliations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(practitioner_id, facility_id)
);

CREATE INDEX idx_practitioner_facility_affiliations ON practitioner_facility_affiliations(practitioner_id);

-- Practitioner assigned patients
CREATE TABLE public.practitioner_assigned_patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(practitioner_id, patient_id)
);

CREATE INDEX idx_practitioner_assigned_patients ON practitioner_assigned_patients(practitioner_id);

-- Patient favorite practitioners
CREATE TABLE public.patient_favorite_practitioners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  practitioner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(patient_id, practitioner_id)
);

CREATE INDEX idx_patient_favorite_practitioners ON patient_favorite_practitioners(patient_id);

-- Patient my doctors (primary care physicians)
CREATE TABLE public.patient_my_doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  practitioner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  linked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(patient_id, practitioner_id)
);

CREATE INDEX idx_patient_my_doctors ON patient_my_doctors(patient_id);
```

### 2.4 Row-Level Security (RLS) Policies

Example RLS policies for Supabase:

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
-- ... etc for all tables

-- Users can view their own profile
CREATE POLICY users_can_view_own
  ON users FOR SELECT
  USING (auth.uid()::text = id::text);

-- Patients can view their own patient record
CREATE POLICY patients_can_view_own
  ON patients FOR SELECT
  USING (auth.uid()::text = user_id::text);

-- Messages: users can see messages in their conversations
CREATE POLICY messages_can_view_own_conversation
  ON messages FOR SELECT
  USING (
    auth.uid()::text IN (
      SELECT DISTINCT (patient_id::text, practitioner_id::text)
      FROM conversations
      WHERE id = conversation_id
    )
  );

-- Practitioners can view consultations they're part of
CREATE POLICY consultations_practitioners
  ON consultations FOR SELECT
  USING (
    auth.uid()::text = practitioner_id::text OR
    auth.uid()::text = patient_id::text
  );
```

### 2.5 PostgreSQL Indexes Summary

| Table | Index | Purpose |
|---|---|---|
| users | email, role, phoneE164, supabaseUid, saId | Lookups & filtering |
| consultations | (patientId, scheduledStart), (practitionerId, scheduledStart) | Appointment queries |
| messages | (conversationId, createdAt), (clientId, conversationId) unique | Chat history, idempotency |
| anthropometric | (patientId, dateRecorded) | Health history queries |
| audit_logs | (actorId, createdAt), (action), (createdAt) | Audit trail queries |
| facilities | coordinates (GiST) | Geographic queries |
| payment_transactions | patientId, timestamp | Billing queries |

---

## Section 3: Data Migration Strategy

### 3.1 Pre-Migration Planning (Week 1-2)

**Deliverables:**
- [ ] Supabase project provisioned with PostgreSQL database
- [ ] PostgreSQL schema deployed (from Section 2.3)
- [ ] Supabase RLS policies configured
- [ ] Migration scripts skeleton created
- [ ] Test environment setup

**Tasks:**
1. Create Supabase organization/project
   - Choose region close to current user base
   - Enable PostGIS extension for geographic queries
   - Enable UUID extension

2. Deploy PostgreSQL schema
   ```bash
   # Using Supabase SQL editor or psql client
   psql -h db.supabase.co -U postgres -d postgres -f schema-20260808.sql
   ```

3. Set up connection pooling
   - Configure PgBouncer on Supabase
   - Set pool size to 10-15 connections

4. Create test data
   - Load sample data for integration testing
   - Ensure schema is compatible

### 3.2 Migration Architecture (Phased Approach)

**Phase 1: Read-Only Migration (Week 3-5)**
- MongoDB remains source of truth
- PostgreSQL updated via ETL process
- Application still reads from MongoDB
- **Duration:** 2-3 weeks
- **Validation:** Data completeness and correctness checks

**Phase 2: Parallel Running (Week 6-8)**
- Application reads from both sources
- Writes go to both (dual-write pattern)
- Comparison middleware validates consistency
- **Duration:** 2-3 weeks
- **Validation:** 99.99% consistency between sources

**Phase 3: Full Migration (Week 9-12)**
- Application reads exclusively from PostgreSQL
- MongoDB kept as backup for 1 month
- Gradual traffic shifting (10% → 25% → 50% → 100%)
- **Duration:** 4 weeks
- **Validation:** Performance metrics, error rate monitoring

**Phase 4: Decommission MongoDB (Week 13+)**
- MongoDB archived (backup maintained)
- Cost optimization
- **Duration:** Ongoing

### 3.3 Data Migration Scripts

#### 3.3.1 MongoDB → PostgreSQL Migration Script Structure

```typescript
// scripts/migrate-mongodb-to-postgres.ts
import mongoose from 'mongoose';
import { createClient } from '@supabase/supabase-js';

const BATCH_SIZE = 1000;
const COLLECTIONS = [
  'User', 'Patient', 'Facility', 'Consultation',
  'Conversation', 'Message', 'Call',
  'ClinicalData', 'RiskScore', 'Billing',
  'AuditLog', 'Notification'
];

async function migrateCollection(collectionName: string) {
  console.log(`Starting migration of ${collectionName}...`);

  const Model = require(`@/lib/models/${collectionName}`).default;
  let processedCount = 0;

  const totalCount = await Model.countDocuments();
  
  while (processedCount < totalCount) {
    const docs = await Model.find()
      .skip(processedCount)
      .limit(BATCH_SIZE)
      .lean();

    const supabaseRows = docs.map(doc => transformDocument(doc, collectionName));

    const { error } = await supabase
      .from(mapCollectionName(collectionName))
      .insert(supabaseRows);

    if (error) {
      console.error(`Error migrating ${collectionName}:`, error);
      throw error;
    }

    processedCount += BATCH_SIZE;
    console.log(`${collectionName}: ${processedCount}/${totalCount}`);
  }

  console.log(`✓ Completed migration of ${collectionName}`);
}

function transformDocument(mongoDoc: any, collectionName: string): any {
  const pg = { ...mongoDoc };

  // Convert MongoDB ObjectId to UUID
  if (pg._id) {
    pg.id = mongoDoc._id.toString();
    delete pg._id;
  }

  // Transform nested ObjectIds
  const idFields = ['userId', 'patientId', 'practitionerId', 'facilityId'];
  for (const field of idFields) {
    if (pg[field] && pg[field]._id) {
      pg[field] = pg[field]._id.toString();
    } else if (pg[field] && typeof pg[field] === 'object' && pg[field].toString) {
      pg[field] = pg[field].toString();
    }
  }

  // Transform array of ObjectIds (e.g., affiliatedFacilityIds)
  for (const key in pg) {
    if (Array.isArray(pg[key]) && pg[key][0] && typeof pg[key][0] === 'object') {
      pg[key] = pg[key].map((item: any) => item.toString());
    }
  }

  // Snake_case conversion
  pg = snakeCaseKeys(pg);

  return pg;
}

function snakeCaseKeys(obj: any): any {
  const newObj: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    newObj[snakeKey] = value;
  }
  return newObj;
}

export async function runMigration() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    for (const collection of COLLECTIONS) {
      await migrateCollection(collection);
    }

    console.log('✓ All migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  runMigration();
}
```

#### 3.3.2 Many-to-Many Relationship Migration

```typescript
// scripts/migrate-relationships.ts
async function migrateAffiliatedFacilities() {
  const practitioners = await PractitionerProfile.find()
    .select('userId affiliatedFacilityIds')
    .lean();

  for (const practitioner of practitioners) {
    for (const facilityId of practitioner.affiliatedFacilityIds || []) {
      await supabase
        .from('practitioner_facility_affiliations')
        .insert({
          practitioner_id: practitioner.userId.toString(),
          facility_id: facilityId.toString(),
        });
    }
  }
}

async function migrateAssignedPatients() {
  const practitioners = await PractitionerProfile.find()
    .select('userId assignedPatientIds')
    .lean();

  for (const practitioner of practitioners) {
    for (const patientId of practitioner.assignedPatientIds || []) {
      await supabase
        .from('practitioner_assigned_patients')
        .insert({
          practitioner_id: practitioner.userId.toString(),
          patient_id: patientId.toString(),
        });
    }
  }
}
```

#### 3.3.3 Array Field Migration (Allergies Example)

```typescript
// MongoDB: MedicalContext has allergies array
// PostgreSQL: separate allergies table

async function migrateAllergies() {
  const medicalContexts = await MedicalContext.find()
    .select('patientId allergies')
    .lean();

  for (const context of medicalContexts) {
    // First create medical_context record
    const { data: mcData } = await supabase
      .from('medical_context')
      .insert({ patient_id: context.patientId.toString() })
      .select('id');

    const mcId = mcData[0].id;

    // Insert allergies
    for (const allergy of context.allergies || []) {
      await supabase
        .from('allergies')
        .insert({
          medical_context_id: mcId,
          allergen: allergy.allergen,
          severity: allergy.severity,
          reaction: allergy.reaction,
          source: allergy.source,
        });
    }
  }
}
```

### 3.4 Data Validation Strategy

```typescript
// scripts/validate-migration.ts
async function validateMigration() {
  const validations = [
    validateRowCounts,
    validateReferencedIds,
    validateNullConstraints,
    validateUniqueConstraints,
    validateDateFormats,
  ];

  let allValid = true;

  for (const validator of validations) {
    try {
      const result = await validator();
      console.log(`✓ ${validator.name}: PASSED`);
    } catch (error) {
      console.error(`✗ ${validator.name}: FAILED`, error);
      allValid = false;
    }
  }

  return allValid;
}

async function validateRowCounts() {
  const collections = [
    { mongo: 'User', pg: 'users' },
    { mongo: 'Consultation', pg: 'consultations' },
    { mongo: 'Message', pg: 'messages' },
  ];

  for (const { mongo, pg } of collections) {
    const mongoCount = await getMongoCount(mongo);
    const pgCount = await getPostgresCount(pg);

    if (mongoCount !== pgCount) {
      throw new Error(
        `${mongo} mismatch: MongoDB=${mongoCount}, PostgreSQL=${pgCount}`
      );
    }
  }
}

async function validateReferencedIds() {
  // Check that all foreign key references exist
  const { data: orphanedMessages } = await supabase
    .from('messages')
    .select('id')
    .not('conversation_id', 'is', null)
    .neq('conversation_id', (
      select('id').from('conversations')
    ));

  if (orphanedMessages && orphanedMessages.length > 0) {
    throw new Error(`Found ${orphanedMessages.length} orphaned messages`);
  }
}

async function validateUniqueConstraints() {
  // Verify unique fields have no duplicates
  const { data: duplicates } = await supabase.rpc('find_duplicates', {
    table_name: 'users',
    column_name: 'email'
  });

  if (duplicates && duplicates.length > 0) {
    throw new Error(`Found ${duplicates.length} duplicate emails`);
  }
}
```

### 3.5 Dual-Write Pattern (Phase 2)

```typescript
// lib/db/dual-write.ts
/**
 * During Phase 2, writes go to both MongoDB and PostgreSQL
 * Reads come from MongoDB, with async validation from PostgreSQL
 */

export async function createConsultation(data: IConsultation) {
  // Primary write to MongoDB (keep existing)
  const mongoResult = await Consultation.create(data);

  // Secondary write to PostgreSQL
  try {
    const pgData = transformConsultationForPostgres(mongoResult);
    await supabase.from('consultations').insert(pgData);
  } catch (error) {
    console.error('Dual-write failed for PostgreSQL:', error);
    // Log but don't fail the main operation
    await logDualWriteError('Consultation', mongoResult._id, error);
  }

  return mongoResult;
}

export async function updateConsultation(id: string, updates: any) {
  // Atomic MongoDB update
  const mongoResult = await Consultation.findByIdAndUpdate(id, updates, {
    new: true,
  });

  // Async PostgreSQL update
  supabase
    .from('consultations')
    .update(transformConsultationForPostgres(updates))
    .eq('id', id)
    .catch((error) => {
      console.error('Dual-write update failed for PostgreSQL:', error);
      logDualWriteError('Consultation', id, error);
    });

  return mongoResult;
}
```

### 3.6 Traffic Migration Strategy (Phase 3)

```typescript
// middleware/db-routing.ts
interface RoutingConfig {
  readFrom: 'mongodb' | 'postgresql' | 'both';
  writeTo: 'mongodb' | 'postgresql' | 'both';
  trafficPercentage: number; // 0-100
}

const routingConfigs: Record<string, RoutingConfig> = {
  week1: { readFrom: 'mongodb', writeTo: 'both', trafficPercentage: 0 },
  week2: { readFrom: 'mongodb', writeTo: 'both', trafficPercentage: 10 },
  week3: { readFrom: 'both', writeTo: 'both', trafficPercentage: 25 },
  week4: { readFrom: 'both', writeTo: 'both', trafficPercentage: 50 },
  week5: { readFrom: 'postgresql', writeTo: 'postgresql', trafficPercentage: 100 },
};

export async function intelligentRead(query: QueryType) {
  const config = getCurrentRoutingConfig();
  const rand = Math.random() * 100;

  if (rand <= config.trafficPercentage) {
    // Read from PostgreSQL
    return await queryPostgres(query);
  } else {
    // Read from MongoDB
    return await queryMongoDB(query);
  }
}
```

---

## Section 4: Implementation Roadmap

### 4.1 Phased Timeline

#### **Phase 1: Preparation & Setup (Weeks 1-2)**

**Week 1:**
- [ ] Days 1-2: Supabase project setup, PostgreSQL provisioning
- [ ] Days 2-3: Schema design review and deployment
- [ ] Days 3-4: PostGIS extension setup for geographic queries
- [ ] Days 4-5: Connection pooling configuration
- **Deliverable:** Supabase PostgreSQL database ready for data

**Week 2:**
- [ ] Days 1-2: Migration script development (User, Patient models)
- [ ] Days 2-3: Data transformation logic testing
- [ ] Days 3-4: Validation script development
- [ ] Days 4-5: Test data loading and verification
- **Deliverable:** Working migration scripts, validated on test data

#### **Phase 2: Initial Data Migration (Weeks 3-5)**

**Week 3: Users & Core Data**
- [ ] Days 1-2: Migrate User collection (40K+ records)
  ```bash
  npm run migrate -- --collection User --batch-size 5000
  ```
- [ ] Days 2-3: Migrate Patient data (15K+ records)
- [ ] Days 3-4: Migrate Facility data (500 records)
- [ ] Days 4-5: Validation and row count verification
- **Deliverable:** Core user and facility data in PostgreSQL

**Week 4: Relationships & Reference Data**
- [ ] Days 1-2: Migrate Consultation (100K+ records)
- [ ] Days 2-3: Migrate Conversation (50K+ records)
- [ ] Days 3-4: Migrate practitioner-facility affiliations
- [ ] Days 4-5: Migrate patient-practitioner relationships
- **Deliverable:** All relationships mapped correctly in PostgreSQL

**Week 5: Transactional & Large Datasets**
- [ ] Days 1-2: Migrate Message records (500K+ records, **slow phase**)
  - Use optimized batch inserts
  - Test with sample of 50K first
- [ ] Days 2-3: Migrate Call records (50K+ records)
- [ ] Days 3-4: Migrate PaymentTransaction (200K+ records)
- [ ] Days 4-5: Full data validation across all tables
- **Deliverable:** Complete data migration, all consistency checks passed

#### **Phase 3: Code Refactoring (Weeks 6-10)**

**Week 6: ORM & Database Layer**
- [ ] Days 1-2: Evaluate TypeScript ORMs (Prisma vs Drizzle vs Knex)
  - Recommended: **Prisma** for schema auto-generation
  - Alternative: **Drizzle** for lightweight approach
- [ ] Days 2-3: Set up chosen ORM with PostgreSQL
- [ ] Days 3-4: Generate TypeScript types from schema
- [ ] Days 4-5: Create database abstraction layer
- **Deliverable:** ORM setup complete, type generation working

**Week 7-8: Core API Routes Refactoring (40+ routes)**
- [ ] Days 1-3: Refactor authentication endpoints
  - `/api/auth/login` - Mongoose → Prisma
  - `/api/auth/register` - Mongoose → Prisma
  - `/api/auth/otp/send` - Mongoose → Prisma
- [ ] Days 3-4: Refactor patient routes (10 routes)
- [ ] Days 4-5: Refactor practitioner routes (15 routes)
- **Deliverable:** 30-40 routes refactored and tested

**Week 9: Remaining Routes & Services**
- [ ] Days 1-2: Refactor consultation/appointment routes (15 routes)
- [ ] Days 2-3: Refactor billing/payment routes (10 routes)
- [ ] Days 3-4: Refactor messaging/conversation routes (12 routes)
- [ ] Days 4-5: Refactor admin/analytics routes (15 routes)
- **Deliverable:** All 117 API routes refactored

**Week 10: NextAuth Migration**
- [ ] Days 1-2: Evaluate NextAuth adapters
  - Switch from `@auth/mongodb-adapter` to `@auth/prisma-adapter` OR custom adapter
- [ ] Days 2-3: Implement new authentication flow
- [ ] Days 3-4: Test session management
- [ ] Days 4-5: Update middleware to use PostgreSQL sessions
- **Deliverable:** NextAuth fully integrated with PostgreSQL

#### **Phase 4: Testing & Validation (Weeks 11-12)**

**Week 11: Integration Testing**
- [ ] Days 1-2: Unit tests for ORM models (500+ tests)
- [ ] Days 2-3: Integration tests for API routes (200+ tests)
- [ ] Days 3-4: End-to-end tests for user flows (50 scenarios)
- [ ] Days 4-5: Performance testing and optimization
- **Deliverable:** 99%+ test passing rate

**Week 12: Production Readiness**
- [ ] Days 1: Database backups and recovery procedures
- [ ] Day 2: Monitoring and alerting setup
  - CPU, memory, query performance
  - Connection pool monitoring
- [ ] Days 2-3: Documentation updates
- [ ] Days 3-4: Staging environment testing
- [ ] Day 5: Cutover plan finalization
- **Deliverable:** Production deployment plan, all systems go

#### **Phase 5: Production Migration (Weeks 13-16)**

**Week 13: Canary Deployment (10% traffic)**
- [ ] Days 1-2: Deploy PostgreSQL version to canary
- [ ] Days 2-3: Monitor canary metrics (latency, errors, p99)
- [ ] Days 3-4: Validate canary consistency
- [ ] Days 4-5: Increase traffic to 10%
- **Deliverable:** PostgreSQL handling 10% production traffic

**Week 14: Gradual Rollout (25% → 50% traffic)**
- [ ] Days 1-2: Increase traffic to 25%
- [ ] Days 2-3: Monitor and validate
- [ ] Day 3: Increase to 50%
- [ ] Days 3-5: Continuous monitoring
- **Deliverable:** PostgreSQL handling 50% production traffic

**Week 15: Majority Migration (50% → 90% traffic)**
- [ ] Days 1-2: Increase traffic to 75%
- [ ] Days 2-3: Increase to 90%
- [ ] Days 3-5: Continuous monitoring for issues
- **Deliverable:** PostgreSQL handling 90% production traffic

**Week 16: Complete Migration (100% traffic, Decommission MongoDB)**
- [ ] Days 1-2: Final 10% migration to PostgreSQL
- [ ] Days 2-3: Validation that all systems operating normally
- [ ] Days 3-4: Keep MongoDB backup online for 1 week
- [ ] Days 4-5: Archive MongoDB, cost optimization
- **Deliverable:** 100% on PostgreSQL, MongoDB archived

### 4.2 Resource Allocation

**Recommended Team:**
- **Backend Engineers:** 2-3 (primary migration work)
- **DevOps Engineer:** 1 (infrastructure, deployment)
- **QA Engineer:** 1-2 (testing, validation)
- **Database Specialist:** 1 (schema, optimization)
- **Tech Lead:** 1 (oversight, decisions)

**Total:** 6-8 people, 16 weeks

**Effort Breakdown:**
- Setup & Infrastructure: 80 hours
- Schema Design & Deployment: 60 hours
- Data Migration Scripts: 100 hours
- Data Validation: 60 hours
- ORM Selection & Setup: 40 hours
- API Route Refactoring: 400 hours (main work)
- Testing: 120 hours
- Performance Optimization: 80 hours
- Documentation & Deployment: 60 hours
- **Total:** ~1000 hours = 20-25 developer weeks

---

## Section 5: Risk Assessment & Mitigation

### 5.1 Risk Matrix

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| **Data Loss During Migration** | Low | Critical | Automated backups, validation scripts, 1-week rollback window |
| **Performance Degradation** | Medium | High | Load testing, query optimization, connection pooling tuning |
| **Consistency Issues** | Medium | High | Dual-write pattern, continuous validation middleware |
| **Extended Downtime** | Low | Critical | Blue-green deployment, feature flags for instant rollback |
| **Incomplete Data Transfer** | Low | High | Row count validation, referential integrity checks |
| **Schema Mismatch** | Medium | Medium | Test migration on staging first, schema versioning |
| **Application Errors Post-Migration** | Medium | High | Comprehensive testing, canary deployment, error tracking |
| **Database Connection Limits** | Medium | Medium | Connection pooling, query optimization, monitoring |
| **Cost Overruns** | Low | Medium | Upfront Supabase pricing review, optimization in Phase 4 |

### 5.2 Mitigation Strategies

#### **Data Loss Prevention**

1. **MongoDB Backup Strategy:**
   - Maintain daily automated backups during entire migration
   - Keep 30-day backup history
   - Test restore procedures weekly

2. **PostgreSQL Validation:**
   - Checksums on all migrated data
   - Foreign key constraint validation
   - Row count verification per table
   - Spot checks on random samples

3. **Rollback Procedure:**
   ```bash
   # If issues detected during Phase 3-4:
   # 1. Revert application to read MongoDB
   # 2. Stop dual-writes
   # 3. Investigate issues
   # 4. Attempt fix or rollback completely
   # 5. Reset PostgreSQL from backup
   ```

#### **Performance Optimization**

1. **Pre-Optimization (Before Migration):**
   - Index all foreign keys before data load
   - Denormalize frequently-joined tables
   - Test query performance on 100M row dataset

2. **Connection Pooling:**
   ```sql
   -- Supabase PgBouncer configuration
   max_client_conn = 100
   max_db_connections = 20
   default_pool_size = 10
   min_pool_size = 5
   ```

3. **Query Optimization:**
   - Replace N+1 queries with JOINs
   - Use EXPLAIN ANALYZE on slow queries
   - Add JSONB indexes if needed

#### **Testing Strategy**

1. **Unit Tests (500+ tests)**
   - Each API endpoint has min. 3 test cases
   - Test for CRUD operations

2. **Integration Tests (200+ tests)**
   - Database transaction tests
   - Referential integrity tests
   - Constraint validation

3. **End-to-End Tests (50 scenarios)**
   - User registration → login → booking → consultation flow
   - Payment processing flow
   - Admin approval workflows

4. **Load Testing**
   - Simulate 1000 concurrent users
   - Test message creation at 100 messages/sec
   - Consultation booking at 50 bookings/min

#### **Monitoring & Alerting**

```yaml
# Monitoring Configuration
alerts:
  database:
    - connection_pool_usage > 80% → alert
    - query_latency_p99 > 500ms → alert
    - failed_queries_rate > 0.1% → critical_alert
    - replication_lag > 5s → alert (if replicated)
  
  application:
    - error_rate > 1% → critical_alert
    - endpoint_latency_p99 > 2s → alert
    - null_pointer_exceptions → critical_alert
  
  data:
    - row_count_mismatch > 100 → alert
    - orphaned_records detected → alert
```

### 5.3 Rollback Procedures

**Level 1: Instant Rollback (Minutes)**
```bash
# Kill traffic to PostgreSQL version
# Route all traffic to MongoDB version
# Disable dual-writes
# Notify team
# Requires: Feature flags, traffic routing setup
```

**Level 2: Data Reset Rollback (Hours)**
```bash
# Restore PostgreSQL from backup to point-in-time
# Rebuild indexes
# Re-run validation
# Resume with next iteration
```

**Level 3: Full MongoDB Restoration (Days)**
```bash
# Use MongoDB backup from before migration
# Verify all data integrity
# Rebuild Mongoose schema cache
# Restart application
```

---

## Section 6: Testing & Validation Strategy

### 6.1 Test Plan Overview

```
Unit Tests (lib & utils)
├── Data transformers
├── Validators
├── ORM models (Prisma)
└── Helper functions

Integration Tests (API routes)
├── Authentication (login, register, OTP)
├── Patient operations (CRUD)
├── Consultation workflow
├── Messaging system
├── Billing operations
└── Admin functions

End-to-End Tests
├── Patient user journey
├── Practitioner appointment flow
├── Hospital admin workflow
├── Payment processing
└── Audit logging

Performance Tests
├── Query performance (p50, p95, p99)
├── Concurrent user simulation
├── Message throughput (msg/sec)
└── Database connection limits

Migration Validation
├── Row count verification
├── Referential integrity
├── Data completeness
└── Schema compliance
```

### 6.2 Test Coverage Targets

| Category | Current (MongoDB) | Target (PostgreSQL) | Type |
|---|---|---|---|
| Unit Tests | 65% | 85% | Code coverage |
| Integration Tests | 45% | 75% | Route coverage |
| E2E Tests | 30% | 60% | User journey coverage |
| **Overall Coverage** | **50%** | **75%** | Combined |

### 6.3 Validation Checklist

**Pre-Migration Validation:**
- [ ] All MongoDB collections accessible
- [ ] Data integrity checks passing
- [ ] No ongoing transactions
- [ ] Backups current and tested
- [ ] PostgreSQL schema deployed
- [ ] Connection pooling configured

**Post-Migration Validation (per phase):**
- [ ] Row counts match exactly (allow for async deletes)
- [ ] Foreign key constraints all valid
- [ ] Unique constraints enforced
- [ ] Date/timestamp formats correct
- [ ] Numeric fields within expected ranges
- [ ] Required fields populated
- [ ] Enum values in acceptable set
- [ ] NULL values in sparse fields only
- [ ] GIS coordinates within valid ranges

**Application-Level Validation:**
- [ ] All API endpoints return expected data
- [ ] Pagination working correctly
- [ ] Filtering and sorting working
- [ ] Transaction creation/update valid
- [ ] Message threading maintains order
- [ ] Calculations (totals, fees) accurate
- [ ] Timestamps using UTC
- [ ] Audit logs capturing all changes

---

## Section 7: Code Changes Required

### 7.1 Database Connection Setup

**Before (Mongoose):**
```typescript
// lib/mongodb.ts
import mongoose from 'mongoose';

export async function connectToDatabase() {
  if (cached.conn) return cached.conn;
  cached.promise = mongoose.connect(MONGODB_URI, opts);
  cached.conn = await cached.promise;
  return cached.conn;
}
```

**After (Prisma + PostgreSQL):**
```typescript
// lib/db.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function connectToDatabase() {
  // Prisma manages connections automatically
  return prisma;
}

export const db = prisma;
```

### 7.2 API Route Refactoring Example

**Before (Mongoose):**
```typescript
// app/api/patient/appointments/route.ts
import { connectToDatabase } from '@/lib/mongodb';
import { Consultation } from '@/lib/models/Consultation';

export async function GET(req: NextRequest) {
  await connectToDatabase();
  const consultations = await Consultation.find({ 
    patientId: userId 
  }).populate('practitionerId', 'firstName lastName');
  
  return NextResponse.json({ data: consultations });
}
```

**After (Prisma):**
```typescript
// app/api/patient/appointments/route.ts
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const consultations = await db.consultation.findMany({
    where: { patient_id: userId },
    include: {
      practitioner: {
        select: { firstName: true, lastName: true }
      }
    },
    orderBy: { scheduled_start_time: 'asc' }
  });
  
  return NextResponse.json({ data: consultations });
}
```

### 7.3 NextAuth Migration

**Before (MongoDB Adapter):**
```typescript
// lib/auth/auth.ts
import { MongoDBAdapter } from "@auth/mongodb-adapter";

export const authOptions: NextAuthOptions = {
  adapter: MongoDBAdapter(connectToDatabase()),
  // ...
};
```

**After (Prisma Adapter):**
```typescript
// lib/auth/auth.ts
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from '@/lib/db';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),
  // ...
};
```

### 7.4 Dependencies Update

**package.json changes:**
```json
{
  "dependencies": {
    // Remove:
    // "mongoose": "^9.7.4",
    // "mongodb": "^6.21.0",
    
    // Add:
    "@prisma/client": "^5.0.0",
    "@auth/prisma-adapter": "^2.0.0"
  },
  "devDependencies": {
    "@prisma/cli": "^5.0.0"
  }
}
```

### 7.5 Environment Variables Update

```env
# OLD (MongoDB)
MONGODB_URI=mongodb+srv://...

# NEW (PostgreSQL/Supabase)
DATABASE_URL=postgresql://[user]:[password]@[host]:[port]/[database]?schema=public

# Supabase specific
SUPABASE_URL=https://[project].supabase.co
SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

---

## Section 8: Success Criteria

### 8.1 Technical Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Data Completeness** | 100% | Row counts match, no orphaned records |
| **Query Performance** | p99 < 200ms | Database query latency |
| **API Response Time** | p99 < 500ms | API endpoint latency |
| **Error Rate** | < 0.1% | Failed requests / total requests |
| **Uptime** | 99.99% | Application availability |
| **Database Connections** | < 80% used | Connection pool utilization |
| **Test Coverage** | 75% | Code coverage percentage |
| **Backup Recovery Time** | < 30 min | RTO for full restore |
| **Data Backup Frequency** | 4x daily | Backup schedule |

### 8.2 Business Success Metrics

| Metric | Target | Impact |
|--------|--------|--------|
| **Cost Savings** | 30-40% | Monthly database costs |
| **Scalability** | 10x capacity | User/data growth potential |
| **Query Speed** | 50% faster | Especially complex queries |
| **Development Velocity** | +25% | Easier data modeling |
| **System Reliability** | 99.99% → 99.95%+ | ACID compliance benefits |
| **Time to Market** | Reduced | PostgreSQL expertise in team |

### 8.3 Cutover Checklist

Before going live to 100% PostgreSQL:

- [ ] Data validation passed all checks
- [ ] All API endpoints tested and working
- [ ] Performance benchmarks met
- [ ] Monitoring and alerting configured
- [ ] Rollback procedure tested
- [ ] Team trained on new stack
- [ ] Documentation updated
- [ ] Customer communication ready
- [ ] Support team briefed
- [ ] Incident response plan ready
- [ ] Database backups verified
- [ ] Load testing completed
- [ ] Security review completed
- [ ] Compliance checklist signed off
- [ ] GO/NO-GO decision from stakeholders

---

## Section 9: Post-Migration (Weeks 17+)

### 9.1 MongoDB Decommissioning

**Week 17-19: Archives & Backups**
- [ ] Export MongoDB data to cold storage (S3/backup service)
- [ ] Maintain for 6 months for legal/compliance
- [ ] Document export procedures
- [ ] Calculate cost savings from MongoDB shutdown

**Week 20+: Lessons Learned**
- [ ] Team retrospective on migration process
- [ ] Document what went well/what to improve
- [ ] Update internal playbooks
- [ ] Share knowledge across organization

### 9.2 Performance Optimization

**Post-Migration Tuning (Months 2-3):**
- Identify slow queries from monitoring data
- Add missing indexes
- Optimize denormalization strategy
- Tune connection pool size based on actual load
- Review and optimize Prisma queries

**Example Query Optimization:**
```sql
-- Before: 2-3 joins, slow
SELECT c.*, u.firstName, u.lastName 
FROM consultations c
LEFT JOIN users u ON c.practitioner_id = u.id
WHERE c.patient_id = $1;

-- After: Same with index hint
SELECT c.*, u.firstName, u.lastName 
FROM consultations c
INNER JOIN users u ON c.practitioner_id = u.id
WHERE c.patient_id = $1
AND c.scheduled_start_time > NOW() - INTERVAL '1 year'
ORDER BY c.scheduled_start_time DESC;
-- With index on (patient_id, scheduled_start_time DESC)
```

### 9.3 Continuous Improvements

**Ongoing Tasks:**
- Monitor query performance monthly
- Update documentation with new patterns
- Train new team members on PostgreSQL/Prisma
- Participate in Supabase community
- Stay updated on PostgreSQL features
- Plan for future scaling needs

---

## Section 10: Dependencies & Prerequisites

### 10.1 External Dependencies

1. **Supabase Account**
   - Pro or higher tier for production
   - PostgreSQL 15+
   - PostGIS extension
   - Required cost: ~$100/month

2. **ORM Library (Prisma)**
   - Version 5.0.0+
   - Type generation support
   - Migration tools

3. **NextAuth.js**
   - Version 5.0.0+
   - Prisma adapter support

4. **Development Tools**
   - PostgreSQL client (psql)
   - Prisma CLI
   - Migration testing tools

### 10.2 Internal Prerequisites

1. **Team Knowledge**
   - PostgreSQL basics (1-2 days training)
   - Prisma ORM (1-2 days training)
   - Supabase platform features

2. **Infrastructure**
   - Staging environment with PostgreSQL
   - Backup/restore procedures
   - Monitoring setup

3. **Planning**
   - Executive approval and budget
   - Team allocation commitment
   - Timeline agreement

---

## Section 11: Appendices

### A. MongoDB Collections & Field Reference

**Complete field mapping document attached:** `MONGODB_FIELD_MAPPING.csv`

### B. PostgreSQL Schema DDL

**Full schema file:** `schema-postgres-20260808.sql`

### C. Migration Scripts Repository

**Location:** `/scripts/migration/`

Files included:
- `migrate-mongodb-to-postgres.ts` - Main migration runner
- `migrate-relationships.ts` - Many-to-many table migration
- `migrate-arrays.ts` - Array field normalization
- `validate-migration.ts` - Data validation
- `rollback-migration.ts` - Rollback procedures

### D. Monitoring & Alerting Configuration

**Datadog/NewRelic configuration:** `monitoring-config.yaml`

### E. Estimated Budget

| Item | Cost | Notes |
|------|------|-------|
| Supabase (monthly) | $100 | Pro tier, 4 months |
| Additional team (2 FTE × 4 months) | $80K | Contractor rate |
| Tools & services | $5K | Testing, monitoring, etc |
| Infrastructure (staging) | $3K | Temporary PostgreSQL resources |
| Contingency (10%) | $8K | Unexpected costs |
| **Total** | **~$96K** | One-time migration cost |

### F. Timeline Visualization

```
WEEKS  1-2   3-5         6-10          11-12      13-16          17+
       ────  ───────────  ─────────────  ────────  ──────────────  ────
       PREP  MIGRATION    REFACTOR      TEST      PRODUCTION      POST
             └─ Data      └─ ORM        └─ QA     └─ Canary
                └─ Scripts    └─ Auth       └─ E2E    └─ Rollout
```

---

## Conclusion

This comprehensive migration plan provides a structured approach to transitioning the 24-7 DigiHealth platform from MongoDB to Supabase PostgreSQL. The phased approach minimizes risk while maintaining system availability throughout the migration process.

**Key Success Factors:**
1. Rigorous data validation at each phase
2. Comprehensive testing before production cutover
3. Gradual traffic migration with instant rollback capability
4. Experienced team with PostgreSQL & Prisma knowledge
5. Clear communication and stakeholder alignment

**Expected Outcomes:**
- **Cost Savings:** 30-40% reduction in database costs
- **Improved Performance:** 50% faster queries, ACID compliance
- **Better Scalability:** 10x capacity growth potential
- **Enhanced Reliability:** 99.99% uptime target
- **Reduced Complexity:** Single database system, Prisma ORM

**Timeline:** 16-20 weeks from start to 100% PostgreSQL (excluding preparation)

**Next Steps:**
1. Review and approve this migration plan
2. Allocate resources (6-8 person team)
3. Set up Supabase project
4. Begin Phase 1 preparations
5. Schedule weekly migration status meetings

---

**Document Prepared By:** Claude AI (Analysis Agent)  
**Date:** 2026-08-08  
**Status:** READY FOR STAKEHOLDER REVIEW  
**Last Updated:** 2026-08-08

---

**Appendix References:**
- [Supabase Documentation](https://supabase.com/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [PostgreSQL Best Practices](https://www.postgresql.org/docs/)
- [MongoDB Migration Patterns](https://docs.mongodb.com/manual/)
