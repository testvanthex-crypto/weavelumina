import { randomBytes } from "crypto";

export function generateSecureToken(): string {
  // Generate a 256-bit (32 bytes) cryptographically secure random token
  return randomBytes(32).toString("hex");
}

export function generateTokenExpiry(minutes: number): Date {
  return new Date(Date.now() + minutes * 60 * 1000);
}
