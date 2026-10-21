import type { Metadata } from "next";
import PracticeEnquiryPage from "@/components/leads/PracticeEnquiryPage";

export const metadata: Metadata = {
  title: "Digitise Your Medical Practice | 24/7 DigiMedCare",
  description:
    "Bring your practice online with 24/7 DigiMedCare: telehealth and in-person bookings, digital records, e-prescriptions and medical aid invoicing. Complete a quick enquiry.",
};

/** Public landing page for practitioners arriving from Meta ads. */
export default function Page() {
  return <PracticeEnquiryPage />;
}
