"use client";

import LegalDocLayout from "@/components/legal/LegalDocLayout";
import telehealthConsent from "@/lib/legal/telehealth-consent";

export default function TelehealthConsentPage() {
  return <LegalDocLayout doc={telehealthConsent} />;
}
