/**
 * Password validation utility
 * Matches backend requirements from backend/app/core/security.py
 */

export interface PasswordValidationResult {
  isValid: boolean
  errors: string[]
}

/**
 * Validate password strength
 *
 * Requirements:
 * - Minimum 8 characters
 * - At least one letter (a-z or A-Z)
 * - At least one number (0-9)
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = []

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long')
  }

  if (!/[a-zA-Z]/.test(password)) {
    errors.push('Password must contain at least one letter')
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * Get password strength level (for visual feedback)
 */
export function getPasswordStrength(password: string): 'weak' | 'medium' | 'strong' {
  const validation = validatePassword(password)

  if (!validation.isValid) {
    return 'weak'
  }

  let score = 0

  // Length bonus
  if (password.length >= 12) score += 2
  else if (password.length >= 10) score += 1

  // Character variety bonus
  if (/[a-z]/.test(password)) score += 1
  if (/[A-Z]/.test(password)) score += 1
  if (/\d/.test(password)) score += 1
  if (/[^a-zA-Z0-9]/.test(password)) score += 2 // Special characters

  if (score <= 3) return 'weak'
  if (score <= 5) return 'medium'
  return 'strong'
}
