import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(new URL("../apps/api/package.json", import.meta.url));
export const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const { S3Client, HeadObjectCommand, PutObjectCommand } = require("@aws-sdk/client-s3");

export function loadMigrationEnv() {
  require("dotenv").config({ path: resolve(repoRoot, ".env"), quiet: true });
}

export function migrationClient() {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    throw new Error("Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY in the environment.");
  }
  if (!/^[a-f0-9]{32}$/i.test(R2_ACCOUNT_ID)) throw new Error("R2_ACCOUNT_ID must be a 32-character Cloudflare account ID.");
  return new S3Client({
    region: "auto",
    endpoint: "https://" + R2_ACCOUNT_ID + ".r2.cloudflarestorage.com",
    credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
    forcePathStyle: true,
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
}

export function failureCode(error) {
  const status = error?.$metadata?.httpStatusCode;
  if (Number.isInteger(status)) return "HTTP " + status;
  if (Number.isInteger(error?.publicStatus)) return "public URL HTTP " + error.publicStatus;
  if (error?.code === "CHECKSUM_CONFLICT") return "existing object has different content";
  if (error?.code === "PUBLIC_CONTENT_TYPE") return "public URL does not serve the expected image type";
  return "check network, bucket permissions and file access";
}

async function existingObject(client, bucket, key, checksum) {
  try {
    const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    if (head.Metadata?.sha256 && head.Metadata.sha256 !== checksum) {
      throw Object.assign(new Error("Object checksum mismatch"), { code: "CHECKSUM_CONFLICT" });
    }
    return true;
  } catch (error) {
    if (error?.$metadata?.httpStatusCode === 404) return false;
    throw error;
  }
}

export async function uploadIfMissing(client, bucket, { key, path, contentType }, cacheControl) {
  const body = await readFile(path);
  const checksum = createHash("sha256").update(body).digest("hex");
  if (await existingObject(client, bucket, key, checksum)) return "SKIP";
  try {
    await client.send(new PutObjectCommand({
      Bucket: bucket, Key: key, Body: body, ContentType: contentType,
      CacheControl: cacheControl, Metadata: { sha256: checksum }, IfNoneMatch: "*",
    }));
  } catch (error) {
    if (error?.$metadata?.httpStatusCode === 412 && await existingObject(client, bucket, key, checksum)) return "SKIP";
    throw error;
  }
  return "UPLOAD";
}

export async function migrateObjects(client, bucket, files, cacheControl, verify) {
  const counts = { UPLOAD: 0, SKIP: 0, FAIL: 0 };
  try {
    for (const file of files) {
      try {
        const action = await uploadIfMissing(client, bucket, file, cacheControl);
        if (verify) await verify(file);
        counts[action] += 1;
        console.log(action + " " + file.key);
      } catch (error) {
        counts.FAIL += 1;
        console.error("FAIL " + file.key + " (" + failureCode(error) + ")");
      }
    }
  } finally {
    client.destroy();
  }
  console.log("Uploaded " + counts.UPLOAD + ", skipped " + counts.SKIP + ", failed " + counts.FAIL + ".");
  if (counts.FAIL) process.exitCode = 1;
}
