/**
 * The standard hospital import format. One sheet per kind; the first row is the header.
 * The hospital is chosen on the admin screen, never written in the file.
 */
export interface ColumnSpec {
  key: string;
  required: boolean;
  description: string;
  example: string;
}

export const PATIENT_COLUMNS: ColumnSpec[] = [
  { key: "file_number", required: true, description: "The hospital's own file number for this patient. Unique within the hospital.", example: "MP-004211" },
  { key: "first_name", required: true, description: "First name(s)", example: "Thandiwe" },
  { key: "last_name", required: true, description: "Surname", example: "Mokoena" },
  { key: "email", required: true, description: "Email address. The set-password link is sent here.", example: "thandiwe@example.com" },
  { key: "id_number", required: true, description: "South African ID number, 13 digits", example: "9001015800087" },
  { key: "date_of_birth", required: true, description: "YYYY-MM-DD (must match the ID number)", example: "1990-01-01" },
  { key: "gender", required: true, description: "male, female or other", example: "female" },
  { key: "mobile", required: true, description: "South African mobile (+27), e.g. 0821234567", example: "0821234567" },
  { key: "medical_aid_provider", required: false, description: "Medical aid name", example: "Discovery Health" },
  { key: "medical_aid_plan", required: false, description: "Plan / option", example: "Classic Saver" },
  { key: "medical_aid_member_number", required: false, description: "Member number", example: "900123456" },
  { key: "emergency_contact_name", required: false, description: "Emergency contact name", example: "Nomsa Mokoena" },
  { key: "emergency_contact_phone", required: false, description: "Emergency contact phone", example: "0829876543" },
  { key: "emergency_contact_relationship", required: false, description: "Relationship to patient", example: "Mother" },
  { key: "blood_type", required: false, description: "A+, A-, B+, B-, AB+, AB-, O+ or O-", example: "O+" },
  { key: "allergies", required: false, description: "Separate several with ;", example: "Penicillin;Latex" },
  { key: "chronic_conditions", required: false, description: "Separate several with ;", example: "Asthma;Hypertension" },
  { key: "current_medications", required: false, description: "Separate several with ;", example: "Ventolin" },
  { key: "referring_doctor", required: false, description: "Referring doctor", example: "Dr A Naidoo" },
  { key: "notes", required: false, description: "Free text for the hospital's own record", example: "" },
];

export const DOCTOR_COLUMNS: ColumnSpec[] = [
  { key: "staff_number", required: true, description: "The hospital's own file/staff number for this doctor. Unique within the hospital.", example: "DR-0457" },
  { key: "first_name", required: true, description: "First name(s)", example: "Sipho" },
  { key: "last_name", required: true, description: "Surname", example: "Khumalo" },
  { key: "email", required: true, description: "Email address. The set-password link is sent here.", example: "sipho.khumalo@example.com" },
  { key: "mobile", required: true, description: "South African mobile (+27), e.g. 0821234567", example: "0711234567" },
  { key: "hpcsa_number", required: true, description: "HPCSA registration number", example: "MP0123456" },
  { key: "specialisation", required: true, description: "Speciality", example: "General Practitioner" },
  { key: "role", required: false, description: "doctor, nurse, technician or admin (default doctor)", example: "doctor" },
  { key: "department", required: false, description: "Department", example: "Emergency" },
  { key: "qualifications", required: false, description: "Separate several with ;", example: "MBChB;DipPEC" },
  { key: "languages", required: false, description: "Separate several with ;", example: "English;isiZulu" },
  { key: "years_experience", required: false, description: "Whole number", example: "8" },
  { key: "shift_start", required: false, description: "HH:MM (24h)", example: "08:00" },
  { key: "shift_end", required: false, description: "HH:MM (24h)", example: "16:00" },
  { key: "shift_days", required: false, description: "Separate with ; e.g. Mon;Tue;Wed", example: "Mon;Tue;Wed;Thu;Fri" },
];

export type ImportKind = "patients" | "doctors";

/**
 * Columns in the downloadable template, kept short on purpose. The importer still accepts
 * the other optional columns above if a hospital includes them.
 */
export const TEMPLATE_KEYS: Record<ImportKind, string[]> = {
  patients: ["file_number", "first_name", "last_name", "email", "id_number", "date_of_birth", "gender", "mobile"],
  doctors: ["staff_number", "first_name", "last_name", "email", "mobile", "hpcsa_number", "specialisation", "role"],
};

export const COLUMNS: Record<ImportKind, ColumnSpec[]> = {
  patients: PATIENT_COLUMNS,
  doctors: DOCTOR_COLUMNS,
};

/** Header cell -> canonical key: lower-case, spaces/dashes to underscores. */
export function canonicalHeader(raw: unknown): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s\-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}
