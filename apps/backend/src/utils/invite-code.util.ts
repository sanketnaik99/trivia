import { randomBytes } from 'crypto';

const CODE_LENGTH = 6;
const CODE_CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/**
 * Generates a random 6-character invite code using uppercase letters and numbers
 */
export function generateInviteCode(): string {
  let code = '';
  const bytes = randomBytes(CODE_LENGTH);

  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_CHARSET[bytes[i] % CODE_CHARSET.length];
  }

  return code;
}

/**
 * Generate a secure token for invite links
 */
export function generateInviteToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Validates that a string is a valid invite code format
 * (6 characters, uppercase letters and numbers only)
 */
export function isValidInviteCode(code: string): boolean {
  if (code.length !== CODE_LENGTH) {
    return false;
  }

  return /^[A-Z0-9]{6}$/.test(code);
}