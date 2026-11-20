import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../config/env.js";

let client: S3Client | null = null;

export function isR2Configured(): boolean {
  return /^[a-f0-9]{32}$/i.test(env.R2_ACCOUNT_ID ?? "")
    && Boolean(env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY && env.R2_PRIVATE_BUCKET)
    && env.R2_PRIVATE_BUCKET !== env.R2_PUBLIC_BUCKET;
}

export function getR2Client(): S3Client | null {
  if (!isR2Configured()) return null;
  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
      forcePathStyle: true,
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    });
  }
  return client;
}

export async function putR2Object(input: { bucket: string; key: string; body: Buffer; contentType: string; cacheControl: string }): Promise<void> {
  const r2 = getR2Client();
  if (!r2) throw new Error("R2 is not configured");
  await r2.send(new PutObjectCommand({ Bucket: input.bucket, Key: input.key, Body: input.body, ContentType: input.contentType, CacheControl: input.cacheControl }), { abortSignal: AbortSignal.timeout(10_000) });
}

export async function deleteR2Object(bucket: string, key: string): Promise<void> {
  const r2 = getR2Client();
  if (!r2) return;
  await r2.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }), { abortSignal: AbortSignal.timeout(10_000) });
}

export async function getR2PresignedUrl(bucket: string, key: string, expiresIn = 900): Promise<string> {
  const r2 = getR2Client();
  if (!r2) throw new Error("R2 is not configured");
  return getSignedUrl(r2, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn });
}

export async function r2ObjectExists(bucket: string, key: string): Promise<boolean> {
  const r2 = getR2Client();
  if (!r2) return false;
  try {
    await r2.send(new HeadObjectCommand({ Bucket: bucket, Key: key }), { abortSignal: AbortSignal.timeout(3_000) });
    return true;
  } catch (error) {
    if (error && typeof error === "object" && "$metadata" in error && (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 404) return false;
    if (error instanceof Error && error.name === "NotFound") return false;
    throw error;
  }
}


