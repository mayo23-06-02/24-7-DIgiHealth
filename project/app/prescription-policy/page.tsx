"use client";

import LegalDocLayout from "@/components/legal/LegalDocLayout";
import prescriptionPolicy from "@/lib/legal/prescription-policy";

export default function PrescriptionPolicyPage() {
  return <LegalDocLayout doc={prescriptionPolicy} />;
}
