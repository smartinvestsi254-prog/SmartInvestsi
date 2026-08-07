/**
 * Input validation helpers shared across apps.
 */

/** RFC 5321-ish email validation with 254 char limit. */
export function isValidEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return typeof email === "string" && email.length <= 254 && re.test(email.trim());
}

export function normalizeEmail(email: string): string {
  return (email || "").trim().toLowerCase();
}

/**
 * E.164 phone validation (e.g. +2547XXXXXXXX).
 * Accepts optional leading '+' and 7-15 digits.
 */
export function isValidPhone(phone: string): boolean {
  const re = /^\+?[1-9]\d{6,14}$/;
  return typeof phone === "string" && re.test(phone.replace(/[\s-]/g, ""));
}

/** Mask a phone number for display: 2547****1234 */
export function maskPhone(phone: string): string {
  if (!phone || phone.length < 6) return "***";
  return phone.slice(0, 4) + "****" + phone.slice(-4);
}

export function isValidPassword(password: string, minLength = 8): boolean {
  return typeof password === "string" && password.length >= minLength;
}

export function isValidUuid(value: string): boolean {
  const re = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return re.test(value);
}

