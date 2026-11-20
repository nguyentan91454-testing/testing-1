import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { basename, dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { HttpError } from "../../http/errors.js";
import { env } from "../../config/env.js";
import { deleteR2Object, getR2PresignedUrl, isR2Configured, putR2Object, r2ObjectExists } from "../../lib/r2.js";

const sourceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const apiRoot = basename(sourceRoot) === "dist" ? dirname(sourceRoot) : sourceRoot;
const storageDirectory = resolve(apiRoot, "uploads/avatars");
const allowed = new Map([["image/jpeg", ".jpg"], ["image/png", ".png"], ["image/webp", ".webp"]]);
const maxBytes = 5 * 1024 * 1024;

export function avatarUploadLimit() { return maxBytes; }
export function avatarMimeExtension(contentType: string) { return allowed.get(contentType); }
export function avatarStoragePath(key: string) {
  validateAvatarKey(key);
  return join(storageDirectory, key);
}
function validateAvatarKey(key: string): void {
  if (!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}\.(jpg|png|webp)$/.test(key)) {
    throw new HttpError(404, "Ảnh đại diện không tồn tại.", "AVATAR_NOT_FOUND");
  }
}
function looksLikeImage(buffer: Buffer, contentType: string) {
  if (contentType === "image/jpeg") return buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (contentType === "image/png") return buffer.length > 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  return buffer.length > 12 && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
}

async function readFilesystemAvatar(key: string) {
  const path = avatarStoragePath(key);
  try {
    const bytes = await readFile(path);
    const extension = extname(path);
    return { bytes, contentType: extension === ".png" ? "image/png" : extension === ".webp" ? "image/webp" : "image/jpeg" };
  } catch { throw new HttpError(404, "Ảnh đại diện không tồn tại.", "AVATAR_NOT_FOUND"); }
}

interface AvatarStorage {
  save(key: string, buffer: Buffer, contentType: string): Promise<void>;
  readUrl(key: string): Promise<string | null>;
  remove(key: string): Promise<void>;
}

export class FilesystemAvatarStorage implements AvatarStorage {
  async save(key: string, buffer: Buffer): Promise<void> {
    await mkdir(storageDirectory, { recursive: true });
    await writeFile(avatarStoragePath(key), buffer, { flag: "wx" });
  }
  async readUrl(): Promise<null> { return null; }
  async remove(key: string): Promise<void> {
    try { await unlink(avatarStoragePath(key)); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
  }
}

export class R2AvatarStorage implements AvatarStorage {
  async save(key: string, buffer: Buffer, contentType: string): Promise<void> {
    validateAvatarKey(key);
    await putR2Object({ bucket: env.R2_PRIVATE_BUCKET, key, body: buffer, contentType, cacheControl: "private, max-age=0, no-store" });
  }
  async readUrl(key: string): Promise<string | null> {
    validateAvatarKey(key);
    if (!await r2ObjectExists(env.R2_PRIVATE_BUCKET, key)) return null;
    return getR2PresignedUrl(env.R2_PRIVATE_BUCKET, key);
  }
  async remove(key: string): Promise<void> {
    validateAvatarKey(key);
    await deleteR2Object(env.R2_PRIVATE_BUCKET, key);
    await filesystemStorage.remove(key);
  }
}

const filesystemStorage = new FilesystemAvatarStorage();
const r2Storage = new R2AvatarStorage();
export function avatarStorageFactory(): AvatarStorage { return isR2Configured() ? r2Storage : filesystemStorage; }

export async function saveAvatar(buffer: Buffer, contentType: string) {
  const extension = allowed.get(contentType);
  if (!extension || buffer.length === 0 || buffer.length > maxBytes || !looksLikeImage(buffer, contentType)) {
    throw new HttpError(400, "Ảnh phải là JPEG, PNG hoặc WebP hợp lệ và không quá 5 MB.", "AVATAR_INVALID");
  }
  const key = randomUUID() + extension;
  await avatarStorageFactory().save(key, buffer, contentType);
  return key;
}

export async function getStoredAvatarUrl(key: string): Promise<string | null> {
  validateAvatarKey(key);
  return avatarStorageFactory().readUrl(key);
}

export async function readStoredAvatar(key: string) {
  return readFilesystemAvatar(key);
}

export async function removeStoredAvatar(key: string | null | undefined) {
  if (!key) return;
  await avatarStorageFactory().remove(key);
}

export function storageDirectoryForTests() { return storageDirectory; }
