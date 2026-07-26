/**
 * Single source of truth for password strength, shared by the client form and
 * the API route so the two can never disagree.
 *
 * These rules mirror the ones enforced during registration in
 * components/auth/Register/validation.ts (>=8 chars, one uppercase, one digit).
 */

export const PASSWORD_RULES = [
  { label: "At least 8 characters", test: (v: string) => v.length >= 8 },
  { label: "One uppercase letter", test: (v: string) => /[A-Z]/.test(v) },
  { label: "One number", test: (v: string) => /[0-9]/.test(v) },
] as const;

/**
 * Returns an error message, or null when the password is acceptable.
 * Message wording matches the registration wizard.
 */
export function validatePassword(password: string): string | null {
  if (!password) return "Password is required.";
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(password))
    return "Password must contain at least one uppercase letter.";
  if (!/[0-9]/.test(password))
    return "Password must contain at least one number.";
  return null;
}

export function validatePasswordConfirmation(
  password: string,
  confirmPassword: string,
): string | null {
  if (!confirmPassword) return "Please confirm your password.";
  if (password !== confirmPassword) return "Passwords do not match.";
  return null;
}
