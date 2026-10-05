export const roleConfig: Record<string, { label: string; color: string; steps: string[] }> = {
  patient: {
    label: "Medical Cover",
    color: "#4493b8",
    steps: [
      "Verify File Number",
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
      "Verify Staff Number", // step 1 — hospital staff number + HPCSA
      "Credentials",        // step 1
      "Identity & Contact", // step 2
      "Documents",          // step 3
      "Payments & Settlements",      // step 4
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
  patient: [3], // Health Profile — optional, can be completed later
};