import { importX509, jwtVerify } from "jose";
import { z } from "zod";
import { env } from "../../config/env.js";

const certificateUrl = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";
const firebaseClaimsSchema = z.object({
  sub: z.string().min(1).max(128),
  user_id: z.string().min(1).max(128).optional(),
  email: z.string().email().max(254),
  email_verified: z.boolean(),
  name: z.string().trim().min(1).max(160).optional(),
  picture: z.string().url().max(2048).optional(),
  firebase: z.object({ sign_in_provider: z.string().min(1).max(80) }).optional(),
});

type CertificateCache = { expiresAt: number; keys: Map<string, Awaited<ReturnType<typeof importX509>>> };
let certificateCache: CertificateCache | null = null;

function cacheLifetime(headers: Headers): number {
  const maxAge = /max-age=(\d+)/i.exec(headers.get("cache-control") ?? "")?.[1];
  return Math.min(Math.max(Number(maxAge ?? 3600) * 1000, 60_000), 24 * 60 * 60 * 1000);
}

async function loadCertificates(): Promise<CertificateCache> {
  if (!env.FIREBASE_PROJECT_ID) throw new Error("Firebase project is not configured");
  if (certificateCache && certificateCache.expiresAt > Date.now()) return certificateCache;
  const response = await fetch(certificateUrl, { signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`Firebase certificate request failed with HTTP ${response.status}`);
  const body = await response.json() as Record<string, string>;
  const keys = new Map<string, Awaited<ReturnType<typeof importX509>>>();
  for (const [kid, certificate] of Object.entries(body)) keys.set(kid, await importX509(certificate, "RS256"));
  certificateCache = { keys, expiresAt: Date.now() + cacheLifetime(response.headers) };
  return certificateCache;
}

export interface FirebaseIdentity {
  firebaseUid: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  emailVerified: boolean;
  provider: string;
}

export async function verifyFirebaseIdToken(token: string): Promise<FirebaseIdentity> {
  if (!env.FIREBASE_PROJECT_ID) throw new Error("Firebase project is not configured");
  const header = JSON.parse(Buffer.from(token.split(".")[0] ?? "", "base64url").toString("utf8")) as { kid?: unknown; alg?: unknown };
  if (header.alg !== "RS256" || typeof header.kid !== "string") throw new Error("Firebase token header is invalid");
  const certificates = await loadCertificates();
  const key = certificates.keys.get(header.kid);
  if (!key) {
    certificateCache = null;
    const refreshed = await loadCertificates();
    if (!refreshed.keys.has(header.kid)) throw new Error("Firebase token signing key is unknown");
  }
  const signingKey = (certificateCache ?? certificates).keys.get(header.kid);
  if (!signingKey) throw new Error("Firebase token signing key is unavailable");
  const { payload } = await jwtVerify(token, signingKey, {
    algorithms: ["RS256"],
    audience: env.FIREBASE_PROJECT_ID,
    issuer: `https://securetoken.google.com/${env.FIREBASE_PROJECT_ID}`,
    requiredClaims: ["exp", "iat", "sub", "aud", "iss"],
  });
  const claims = firebaseClaimsSchema.parse(payload);
  const provider = claims.firebase?.sign_in_provider ?? "unknown";
  if (!claims.email_verified || provider !== "google.com") throw new Error("Firebase Google identity is not verified");
  return {
    firebaseUid: claims.user_id ?? claims.sub,
    email: claims.email.toLowerCase(),
    name: claims.name ?? claims.email,
    avatarUrl: claims.picture ?? null,
    emailVerified: claims.email_verified,
    provider,
  };
}

export function readFirebaseBearer(request: { get(name: string): string | undefined }): string {
  const value = request.get("authorization");
  const match = /^Bearer\s+([^\s]+)$/i.exec(value ?? "");
  if (!match) throw new Error("Firebase bearer token is missing");
  return match[1]!;
}

export function resetFirebaseCertificateCache(): void {
  certificateCache = null;
}
