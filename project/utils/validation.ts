"use client";

/**
 * Validates a South African Identity Number 
 * Using the Luhn Algorithm (checksum)
 */
export function validateSaId(idNumber: string): boolean {
  if (!idNumber || idNumber.length !== 13 || !/^\d+$/.test(idNumber)) {
    return false;
  }

  // Check DOB part (YYMMDD)
  const month = parseInt(idNumber.substring(2, 4));
  const day = parseInt(idNumber.substring(4, 6));
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  // Luhn Checksum
  let nCheck = 0;
  let bEven = false;
  for (let n = idNumber.length - 1; n >= 0; n--) {
    let cDigit = idNumber.charAt(n);
    let nDigit = parseInt(cDigit, 10);
    if (bEven && (nDigit *= 2) > 9) nDigit -= 9;
    nCheck += nDigit;
    bEven = !bEven;
  }

  return nCheck % 10 === 0;
}

/**
 * Validates HPCSA Practitioner Registration Numbers
 * Pattern: MPXXXXXXX or similar (prefix + digits)
 */
export function validateHpcsa(number: string): boolean {
  const hpcsaRegex = /^[A-Z]{2}\d{6}$/;
  return hpcsaRegex.test(number.to());
}

/**
 * Validates South African Mobile Numbers (E.164)
 * Allows +27 extension or local leading 0
 */
export function validateMobile(mobile: string): boolean {
  const saMobileRegex = /^(?:\+27|0)[6-8][0-9]{8}$/;
  return saMobileRegex.test(mobile.replace(/\s+/g, ''));
}
