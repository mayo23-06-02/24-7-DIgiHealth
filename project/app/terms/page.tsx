"use client";

import LegalDocLayout from "@/components/legal/LegalDocLayout";
import patientTerms from "@/lib/legal/patient-terms";

/**
 * Patient Terms and Conditions — this route is what the patient
 * registration consent step links to. Kept at /terms (rather than moved to
 * /terms/patient) since that's the URL already wired into the registration
 * flow and any bookmarks/QA notes referencing it.
 */
export default function TermsPage() {
  return <LegalDocLayout doc={patientTerms} />;
}
