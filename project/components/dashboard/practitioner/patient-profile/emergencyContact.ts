/**
 * Whether an emergency contact actually holds usable information.
 *
 * Registration defaults the contact's fields to the literal string "N/A" when
 * the patient skips them, which is truthy — so every `contact?.name ? … : …`
 * check passed and the UI rendered "N/A" three times over instead of its own
 * empty state. Placeholders are treated as absent here so that only one rule
 * decides it, and both the header and the sidebar agree.
 */
export type EmergencyContact = {
  name?: string;
  relationship?: string;
  phone?: string;
} | null | undefined;

const PLACEHOLDERS = new Set(["", "n/a", "na", "none", "-", "unknown"]);

/** A field that is blank or a stand-in for blank. */
export function isPlaceholderValue(value?: string): boolean {
  return PLACEHOLDERS.has(String(value ?? "").trim().toLowerCase());
}

/** Real if there is a name or a phone number worth showing a clinician. */
export function hasEmergencyContact(contact: EmergencyContact): boolean {
  if (!contact) return false;
  return !isPlaceholderValue(contact.name) || !isPlaceholderValue(contact.phone);
}
