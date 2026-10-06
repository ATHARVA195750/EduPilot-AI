/**
 * ID generator and deterministic authentication identifier utility.
 * 
 * Identifier conventions:
 * - Student ID: STU-YY-XXXX (e.g. STU-26-0001)
 * - Teacher ID: TCH-YY-XXXX (e.g. TCH-26-0001)
 * 
 * Internal Auth identifier format (server-only / local mapping):
 * - stu_<id_code_lower_alphanumeric>@edupilot.internal
 * - tch_<id_code_lower_alphanumeric>@edupilot.internal
 * 
 * NEVER displayed to end-users or returned to the browser.
 */

export function sanitizeIdCode(idCode) {
  if (!idCode || typeof idCode !== 'string') return '';
  return idCode.trim().toUpperCase();
}

export function idCodeToInternalEmail(idCode, role) {
  let clean = sanitizeIdCode(idCode).toLowerCase().replace(/[^a-z0-9]/g, '_');
  const prefix = role === 'teacher' ? 'tch' : 'stu';
  // Strip leading prefix if already present in ID string (e.g. stu_26_0042 -> avoid stu_stu_26_0042)
  if (clean.startsWith(`${prefix}_`)) {
    clean = clean.slice(prefix.length + 1);
  }
  return `${prefix}_${clean}@edupilot.internal`;
}


export function generateNextIdLocal(prefix, lastNumber) {
  const yearSuffix = new Date().getFullYear().toString().slice(-2);
  const nextSeq = String(lastNumber + 1).padStart(4, '0');
  return `${prefix}-${yearSuffix}-${nextSeq}`;
}

export function generateSecureTemporaryPassword(length = 10) {
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lowercase = 'abcdefghijkmnpqrstuvwxyz';
  const numbers = '23456789';
  const symbols = '!@#$%&*';
  const all = uppercase + lowercase + numbers + symbols;

  let password = '';
  // Ensure at least one of each required class
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];

  for (let i = password.length; i < length; i++) {
    password += all[Math.floor(Math.random() * all.length)];
  }

  // Shuffle characters
  return password
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');
}
