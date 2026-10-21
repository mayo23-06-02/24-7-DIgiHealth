/** Options for the "Digitise Your Medical Practice" enquiry form (Meta ad landing page). */

export const PRACTICE_SPECIALITIES = [
  "General Practitioner",
  "Paediatrician",
  "Cardiologist",
  "Dermatologist",
  "Psychiatrist",
  "Psychologist",
  "Gynaecologist",
  "Neurologist",
  "Physician",
  "Surgeon",
  "Ophthalmologist",
  "Dentist",
  "Physiotherapist",
  "Other",
] as const;

export const PRACTICE_SIZES = ["Solo Practitioner", "2–5 Practitioners", "6+ Practitioners"] as const;

export const PRACTICE_NEXT_STEPS = [
  "Register my practice",
  "Book a demonstration",
  "Receive pricing and more information",
] as const;

/** Inbox that receives every enquiry. */
export const PRACTICE_ENQUIRY_INBOX = "admin@digi-health.co.za";
