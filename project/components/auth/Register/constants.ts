export const roleConfig: Record<string, { label: string; color: string; steps: string[] }> = {
  patient: {
    label: "Medical Cover",
    color: "#4493b8",
    steps: [
      "Identity",
      "Privacy Consent",
      "Health Profile",
      "Payment Setup",
      "Emergency & Info",
      "Documents",
      "Security",
      "Preview",
    ],
  },
  practitioner: {
    label: "Healthcare Professional",
    color: "#4493b8",
    steps: [
      "Credentials",
      "Identity & Contact",
      "Documents",
      "Banking & Tax",
      "Security",
      "Preview",
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
  patient: [3, 5], // 1‑indexed steps that can be skipped
};