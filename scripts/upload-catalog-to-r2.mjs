import { readdir } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { loadMigrationEnv, migrateObjects, migrationClient, repoRoot } from "./r2-migration.mjs";

const contentTypes = new Map([
  [".jpg", "image/jpeg"], [".jpeg", "image/jpeg"], [".png", "image/png"],
  [".webp", "image/webp"], [".gif", "image/gif"], [".svg", "image/svg+xml"],
  [".avif", "image/avif"], [".ico", "image/x-icon"],
]);

async function catalogFiles(directory, prefix = "") {
  const files = [];
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const path = resolve(directory, entry.name);
    const key = prefix + entry.name;
    if (entry.isDirectory()) files.push(...await catalogFiles(path, key + "/"));
    const contentType = contentTypes.get(extname(entry.name).toLowerCase());
    if (entry.isFile() && contentType) files.push({ path, key, contentType });
  }
  return files;
}

function publicVerifier() {
  const base = process.env.R2_PUBLIC_BASE_URL?.trim();
  if (!base) return undefined;
  let url;
  try { url = new URL(base); } catch {}
  if (!url || !base.startsWith("https://") || url.username || url.password || url.search || url.hash || base.includes("\\")) {
    throw new Error("R2_PUBLIC_BASE_URL must be a valid HTTPS URL.");
  }
  return async ({ key, contentType }) => {
    const encodedKey = key.split("/").map(encodeURIComponent).join("/");
    const response = await fetch(base.replace(/\/+$/, "") + "/" + encodedKey, {
      method: "HEAD", redirect: "error", signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw Object.assign(new Error("Public URL lookup failed"), { publicStatus: response.status });
    if (response.headers.get("content-type")?.split(";")[0]?.trim() !== contentType) {
      throw Object.assign(new Error("Unexpected content type"), { code: "PUBLIC_CONTENT_TYPE" });
    }
  };
}

try {
  loadMigrationEnv();
  const files = await catalogFiles(resolve(repoRoot, "apps/web/public/images"));
  if (!files.length) console.log("No local catalog images found.");
  else {
    const publicBucket = process.env.R2_PUBLIC_BUCKET?.trim() || "konyappi-shop";
    const privateBucket = process.env.R2_PRIVATE_BUCKET?.trim() || "konyappi-shop-private";
    if (publicBucket === privateBucket) throw new Error("Use different buckets for catalog and avatars.");
    const verify = publicVerifier();
    await migrateObjects(migrationClient(), publicBucket, files, "public, max-age=31536000, immutable", verify);
    if (!verify && !process.exitCode) console.log("Set R2_PUBLIC_BASE_URL and rerun to verify public URLs before restarting the API or rebuilding the storefront.");
  }
} catch (error) {
  console.error("Catalog migration could not start. Check R2 configuration and the local images directory.");
  if (error instanceof Error && /^(Set R2_|R2_|Use different buckets)/.test(error.message)) console.error(error.message);
  process.exitCode = 1;
}
