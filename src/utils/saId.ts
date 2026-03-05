import type { Gender } from '../types/supplier'

export interface SAIdResult {
  isValid: boolean
  dateOfBirth: string | null
  gender: 'male' | 'female' | null
}

/**
 * Validate a South African 13-digit ID number and extract metadata.
 *
 * SA ID format: YYMMDDSSSSCAZ
 *   YYMMDD  – date of birth
 *   SSSS    – sequence / gender (0000–4999 = female, 5000–9999 = male)
 *   C       – citizenship (0 = SA citizen, 1 = permanent resident)
 *   A       – race digit (legacy, always ignored)
 *   Z       – Luhn check digit
 */
export function parseSAId(idNumber: string): SAIdResult {
  const invalid: SAIdResult = { isValid: false, dateOfBirth: null, gender: null }

  // Must be exactly 13 digits
  if (!/^\d{13}$/.test(idNumber)) return invalid

  // --- Luhn algorithm check ---
  const digits = idNumber.split('').map(Number)
  let sum = 0
  for (let i = 0; i < 12; i++) {
    if (i % 2 === 0) {
      // Odd positions (0-indexed even): add digit directly
      sum += digits[i]
    } else {
      // Even positions (0-indexed odd): double the digit
      const doubled = digits[i] * 2
      sum += doubled > 9 ? doubled - 9 : doubled
    }
  }
  const checkDigit = (10 - (sum % 10)) % 10
  if (checkDigit !== digits[12]) return invalid

  // --- Date of birth ---
  const yy = idNumber.slice(0, 2)
  const mm = idNumber.slice(2, 4)
  const dd = idNumber.slice(4, 6)

  const currentYear = new Date().getFullYear()
  const currentCentury = Math.floor(currentYear / 100) * 100
  const fullYear =
    parseInt(yy, 10) + currentCentury > currentYear
      ? parseInt(yy, 10) + currentCentury - 100
      : parseInt(yy, 10) + currentCentury

  const dateOfBirthStr = `${fullYear}-${mm}-${dd}`
  const dob = new Date(dateOfBirthStr)

  // Verify the date is actually valid (e.g. not 30 Feb)
  if (
    isNaN(dob.getTime()) ||
    dob.getMonth() + 1 !== parseInt(mm, 10) ||
    dob.getDate() !== parseInt(dd, 10)
  ) {
    return invalid
  }

  // --- Gender ---
  const genderSeq = parseInt(idNumber.slice(6, 10), 10)
  const gender: Gender = genderSeq >= 5000 ? 'male' : 'female'

  return {
    isValid: true,
    dateOfBirth: dateOfBirthStr,
    gender,
  }
}
