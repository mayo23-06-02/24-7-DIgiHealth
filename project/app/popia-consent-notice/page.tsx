"use client";

import LegalDocLayout from "@/components/legal/LegalDocLayout";
import popiaConsentNotice from "@/lib/legal/popia-consent-notice";

export default function PopiaConsentNoticePage() {
  return <LegalDocLayout doc={popiaConsentNotice} />;
}
