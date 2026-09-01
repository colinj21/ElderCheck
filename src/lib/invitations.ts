import { randomBytes, createHash } from "crypto";

/**
 * Generates an unpredictable, URL-safe invitation token. Only the
 * SHA-256 hash of this value is ever persisted -- the raw token is
 * shown to the admin exactly once (in the invite link) and is never
 * stored or logged.
 */
export function generateInvitationToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashInvitationToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
