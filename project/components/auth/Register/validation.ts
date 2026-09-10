import { roleConfig } from "./constants";
import { composeRegistrationPhone } from "@/lib/phone/normalizePhone";

export function validateStep(role: string, step: number, formData: any): Record<string, string> {
  const err: Record<string, string> = {};

  if (role === "patient") {
    // Step 1: Identity
    if (step === 1) {
      if (!formData.firstName?.trim()) err.firstName = "First name is required.";
      if (!formData.lastName?.trim()) err.lastName = "Last name is required.";

      // SA ID validation
      const saId = formData.saId?.replace(/\D/g, "");
      if (!saId || saId.length !== 13) {
        err.saId = "SA ID must be exactly 13 digits.";
      } else {
        // Validate date of birth from ID (first 6 digits: YYMMDD)
        const year = parseInt(saId.substring(0, 2), 10);
        const month = parseInt(saId.substring(2, 4), 10);
        const day = parseInt(saId.substring(4, 6), 10);
        const fullYear = year + (year >= 0 && year <= 20 ? 2000 : 1900);
        const idDate = new Date(fullYear, month - 1, day);
        if (isNaN(idDate.getTime())) {
          err.saId = "Invalid ID number (invalid date).";
        } else {
          // Compare with provided DOB
          if (formData.dob) {
            const dobDate = new Date(formData.dob);
            if (dobDate.toDateString() !== idDate.toDateString()) {
              err.dob = "Date of birth does not match ID number.";
              err.saId = "Date of birth does not match ID number.";
            }
          }
          // Age check: must be >= 18
          const today = new Date();
          let age = today.getFullYear() - idDate.getFullYear();
          const m = today.getMonth() - idDate.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < idDate.getDate())) age--;
          if (age < 18) err.saId = "You must be at least 18 years old.";
        }
      }

      // Phone: South Africa (+27) or Eswatini (+268)
      const phone = composeRegistrationPhone(
        formData.countryCode,
        formData.mobile,
      );
      if (!phone) {
        err.mobile =
          "Enter a valid South Africa (+27) or Eswatini (+268) mobile number.";
      }

      if (!formData.email?.trim() || !formData.email.includes("@")) {
        err.email = "A valid email address is required.";
      }
      if (!formData.gender) err.gender = "Please select your biological gender.";
    }

    // Step 2: Health Profile – optional? We'll make it mandatory only for BMI if they enter weight/height.
    // We'll not validate this step to allow skipping if needed, but since we removed skip, we can add minimal validation.
    // For now, no validation on step 2.
    // Step 3: Documents – no validation (uploads optional)
    // Step 4: Password (second-to-last)
    // Step 5: POPIA consent (last user step)
    // Step 6: Preview – not validated here.
  }

  // Security: password + email OTP – patient step 4
  if (role === "patient" && step === 4) {
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

  // POPIA consent validation – patient step 5
  if (role === "patient" && step === 5) {
    if (!formData.consent) err.consent = "POPIA consent is required.";
    if (!formData.termsAccepted)
      err.termsAccepted = "You must agree to the Terms and Conditions.";
  }

  // ─── Hospital validation ───
  if (role === "hospital") {
    // Step 1: Facility Details
    if (step === 1) {
      if (!formData.facilityName?.trim()) err.facilityName = "Facility name is required.";
      if (!formData.dohRegNumber?.trim()) err.dohRegNumber = "DoH Registration number is required.";
      if (!formData.facilityType) err.facilityType = "Facility type is required.";
      // bedCapacity is optional
    }

    // Step 2: Address & Admin
    if (step === 2) {
      if (!formData.street?.trim()) err.street = "Street address is required.";
      if (!formData.city?.trim()) err.city = "City is required.";
      if (!formData.province) err.province = "Please select a province.";
      if (!formData.adminName?.trim()) err.adminName = "Admin name is required.";
      if (!formData.adminEmail?.trim() || !formData.adminEmail.includes("@")) {
        err.adminEmail = "A valid work email is required.";
      }
      // proofOfEmployment is optional? but we might want to require it.
      // I'll leave as optional for now.
    }

    // Step 3: B2B Agreement
    if (step === 3) {
      if (!formData.b2bAgreement) err.b2bAgreement = "You must accept the B2B agreement.";
    }

    // Step 4: Facility Media – no validation (all uploads optional)

    // Step 5: password + email OTP
    if (step === 5) {
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
  }

  // ... inside validateStep

if (role === "practitioner") {
  // Step 1: Credentials
  if (step === 1) {
    if (!formData.hpcsaNumber?.match(/^[A-Z]{2}\d{5,7}$/)) {
      err.hpcsaNumber = "Format: 2 letters + 5–7 digits (e.g. MP123456).";
    }
    if (!formData.practiceNumber?.trim()) err.practiceNumber = "Practice number is required.";
    if (!formData.experience || parseInt(formData.experience) < 0) {
      err.experience = "Please enter valid years of experience.";
    }
    if (!formData.specialization) err.specialization = "Please select a specialisation.";
  }

  // Step 2: Identity & Contact
  if (step === 2) {
    if (!formData.fullName?.trim()) err.fullName = "Full name is required.";
    // SA ID is optional – skip validation
    const phone = composeRegistrationPhone(
      formData.countryCode,
      formData.mobile,
    );
    if (!phone) {
      err.mobile =
        "Enter a valid South Africa (+27) or Eswatini (+268) mobile number.";
    }
    if (!formData.email?.trim() || !formData.email.includes("@")) {
      err.email = "A valid email address is required.";
    }
    if (!formData.street?.trim()) err.street = "Street address is required.";
    if (!formData.city?.trim()) err.city = "City is required.";
    if (!formData.province) err.province = "Please select a province.";
    if (!formData.languages || formData.languages.length === 0) {
      err.languages = "Please select at least one language.";
    }
  }

  // Step 3: Documents
  if (step === 3) {
    if (!formData.bgCheckConsent) err.bgCheckConsent = "Background check consent is required.";
    // profilePhoto and hpcsaCert are optional (you can make them required if needed)
  }

  // Step 4: Banking
  if (step === 4) {
    if (!formData.bankHolder?.trim()) err.bankHolder = "Account holder name is required.";
    if (!formData.bankName) err.bankName = "Please select a bank.";
    if (!formData.bankAccount?.trim() || !/^\d+$/.test(formData.bankAccount)) {
      err.bankAccount = "Valid account number required (digits only).";
    }
  }

  // Step 5: password + email OTP
  if (step === 5) {
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
}

  return err;
}