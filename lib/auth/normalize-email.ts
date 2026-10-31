/** Normalize emails for login, registration, and lookups. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
