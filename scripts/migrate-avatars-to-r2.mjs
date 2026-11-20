import { readdir } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { loadMigrationEnv, migrateObjects, migrationClient, repoRoot } from "./r2-migration.mjs";

const directory = resolve(repoRoot, "apps/api/uploads/avatars");
const contentTypes = { ".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };
const avatarKey = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}\.(jpg|png|webp)$/;

try {
  const entries = await readdir(directory, { withFileTypes: true }).catch((error) => {
    if (error.code === "ENOENT") return [];
    throw error;
  });
  const files = entries.filter((entry) => entry.isFile() && avatarKey.test(entry.name)).map(({ name }) => ({
    key: name, path: resolve(directory, name), contentType: contentTypes[extname(name)],
  }));
  if (!files.length) console.log("No local avatar files found.");
  else {
    loadMigrationEnv();
    const privateBucket = process.env.R2_PRIVATE_BUCKET?.trim() || "konyappi-shop-private";
    const publicBucket = process.env.R2_PUBLIC_BUCKET?.trim() || "konyappi-shop";
    if (privateBucket === publicBucket) throw new Error("Use different buckets for catalog and avatars.");
    await migrateObjects(migrationClient(), privateBucket, files, "private, no-store");
  }
} catch (error) {
  console.error("Avatar migration could not start. Check R2 configuration and the local avatar directory.");
  if (error instanceof Error && /^(Set R2_|R2_|Use different buckets)/.test(error.message)) console.error(error.message);
  process.exitCode = 1;
}
