export const roleConfig: Record<string, { label: string; color: string; steps: string[] }> = {
  patient: {
    label: "Medical Cover",
    color: "#4493b8",
    steps: [
      "Identity",
      "Health Profile",
      "Documents",
      "Security",
      "Privacy Consent",
      "Preview",
    ],
  },
  practitioner: {
    label: "Healthcare Professional",
    color: "#4493b8",
    steps: [
      "Credentials",        // step 1
      "Identity & Contact", // step 2
      "Documents",          // step 3
      "Banking & Tax",      // step 4
      "Security",           // step 5 — password + email OTP
      "Preview",            // step 6
    ],
  },
  hospital: {
    label: "Healthcare Provider",
    color: "#4493b8",
    steps: [
      "Facility Details",
      "Address & Admin",
      "B2B Agreement",
      "Facility Media",
      "Security",
      "Preview",
    ],
  },
};

export const skippableSteps: Record<string, number[]> = {
  // none for now
};