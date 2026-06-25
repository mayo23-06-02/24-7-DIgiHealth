import { roleConfig } from "./constants";

export function validateStep(role: string, step: number, formData: any): Record<string, string> {
  const err: Record<string, string> = {};

  if (role === "patient" && step === 1) {
    if (!formData.firstName?.trim()) err.firstName = "First name is required.";
    if (!formData.saId || formData.saId.length !== 13) err.saId = "SA ID must be exactly 13 digits.";
    const cleanMobile = formData.mobile?.replace(/\s+/g, "");
    if (!cleanMobile?.match(/^(\+27|0)[6-8][0-9]{8}$/)) err.mobile = "Enter a valid SA mobile number.";
    if (!formData.email?.trim() || !formData.email.includes("@")) err.email = "A valid email address is required.";
    if (!formData.gender) err.gender = "Please select your biological gender.";
  }
  if (role === "practitioner" && step === 1) {
    if (!formData.hpcsaNumber?.match(/^[A-Z]{2}\d{5,7}$/)) err.hpcsaNumber = "Format: 2 letters + 5–7 digits (e.g. MP123456).";
    if (!formData.specialization) err.specialization = "Please select a specialisation.";
    if (!formData.practiceNumber?.trim()) err.practiceNumber = "Practice number is required.";
  }
  if (role === "hospital" && step === 1) {
    if (!formData.facilityName?.trim()) err.facilityName = "Facility name is required.";
    if (!formData.dohRegNumber?.trim()) err.dohRegNumber = "DoH Registration number is required.";
  }

  if (role === "practitioner" && step === 2) {
    const cleanMobile = formData.mobile?.replace(/\s+/g, "");
    if (!cleanMobile?.match(/^(\+27|0)[6-8][0-9]{8}$/)) err.mobile = "Enter a valid SA mobile number.";
    if (!formData.email?.trim() || !formData.email.includes("@")) err.email = "A valid email address is required.";
    if (!formData.languages || formData.languages.length === 0) err.languages = "Please select at least one language.";
  }
  if (role === "hospital" && step === 2) {
    if (!formData.adminEmail?.trim() || !formData.adminEmail.includes("@")) err.adminEmail = "A valid work email address is required.";
  }
  if (role === "patient" && step === 2) {
    if (!formData.consent) err.consent = "POPIA consent is required.";
  }

  // Password validation (always the second‑to‑last step)
  const totalSteps = roleConfig[role]?.steps.length;
  if (step === totalSteps - 1) {
    if (!formData.password) {
      err.password = "Password is required.";
    } else if (formData.password.length < 8) {
      err.password = "Password must be at least 8 characters.";
    } else if (!/[A-Z]/.test(formData.password)) {
      err.password = "Password must contain at least one uppercase letter.";
    } else if (!/[0-9]/.test(formData.password)) {
      err.password = "Password must contain at least one number.";
    }
    if (formData.password !== formData.confirmPassword) {
      err.confirmPassword = "Passwords do not match.";
    }
  }

  return err;
}