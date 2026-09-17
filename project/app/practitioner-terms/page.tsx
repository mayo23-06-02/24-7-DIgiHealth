"use client";

import LegalDocLayout from "@/components/legal/LegalDocLayout";
import practitionerTerms from "@/lib/legal/practitioner-terms";

export default function PractitionerTermsPage() {
  return <LegalDocLayout doc={practitionerTerms} />;
}
