import { createHash, timingSafeEqual } from "node:crypto";

export interface GoogleIdentity {
  googleSub: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

export function matchesOAuthState(stored: string | undefined, returned: string): boolean {
  if (!stored) return false;
  const storedBytes = Buffer.from(stored);
  const returnedBytes = Buffer.from(returned);
  return storedBytes.length === returnedBytes.length && timingSafeEqual(storedBytes, returnedBytes);
}

export function readGoogleIdentity(claims: {
  sub?: unknown;
  email?: unknown;
  email_verified?: unknown;
  name?: unknown;
  picture?: unknown;
  nonce?: unknown;
}, expectedNonce: string): GoogleIdentity | null {
  if (typeof claims.sub !== "string" || !claims.sub
    || typeof claims.email !== "string" || !claims.email
    || (claims.email_verified !== true && claims.email_verified !== "true")
    || claims.nonce !== expectedNonce) return null;
  const email = claims.email.trim().toLowerCase();
  if (!email || !email.includes("@")) return null;
  return {
    googleSub: claims.sub,
    email,
    name: typeof claims.name === "string" && claims.name.trim() ? claims.name.trim().slice(0, 160) : email,
    avatarUrl: typeof claims.picture === "string" && claims.picture.startsWith("https://") ? claims.picture : null,
  };
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
