import { DeleteObjectCommand, HeadObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  avatarStorageFactory, FilesystemAvatarStorage, getStoredAvatarUrl, removeStoredAvatar,
  R2AvatarStorage, saveAvatar,
} from "../modules/auth/customer-avatar-storage.js";
import { getR2Client } from "./r2.js";

const { config } = vi.hoisted(() => ({
  config: {
    R2_ACCOUNT_ID: "a".repeat(32), R2_ACCESS_KEY_ID: "test-key-id", R2_SECRET_ACCESS_KEY: "test-signing-only",
    R2_PUBLIC_BUCKET: "test-catalog", R2_PRIVATE_BUCKET: "test-avatars",
  },
}));
vi.mock("../config/env.js", () => ({ env: config }));

const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
const key = "00000000-0000-4000-8000-000000000012.jpg";

beforeEach(() => { config.R2_PRIVATE_BUCKET = "test-avatars"; });
afterEach(() => vi.restoreAllMocks());

describe("Cloudflare R2 avatar storage", () => {
  it("does not create or select R2 without the private bucket or with the public bucket", () => {
    for (const bucket of ["", config.R2_PUBLIC_BUCKET]) {
      config.R2_PRIVATE_BUCKET = bucket;
      expect(getR2Client()).toBeNull();
      expect(avatarStorageFactory()).toBeInstanceOf(FilesystemAvatarStorage);
    }
  });

  it("selects R2 lazily and reuses the client configured for Cloudflare", async () => {
    expect(avatarStorageFactory()).toBeInstanceOf(R2AvatarStorage);
    const client = getR2Client()!;
    expect(getR2Client()).toBe(client);
    expect(await client.config.region()).toBe("auto");
    expect((await client.config.endpoint!()).hostname).toBe(config.R2_ACCOUNT_ID + ".r2.cloudflarestorage.com");
  });

  it("uploads to the private bucket under a generated key and deletes that object", async () => {
    const send = vi.spyOn(getR2Client()!, "send").mockResolvedValue(undefined);
    const generatedKey = await saveAvatar(jpeg, "image/jpeg");
    expect(generatedKey).toMatch(/^[a-f0-9-]{36}\.jpg$/);
    const [upload] = send.mock.calls[0]!;
    expect(upload).toBeInstanceOf(PutObjectCommand);
    expect(upload.input).toMatchObject({
      Bucket: config.R2_PRIVATE_BUCKET, Key: generatedKey, Body: jpeg, ContentType: "image/jpeg",
      CacheControl: expect.stringContaining("no-store"),
    });
    await removeStoredAvatar(generatedKey);
    const [remove] = send.mock.calls[1]!;
    expect(remove).toBeInstanceOf(DeleteObjectCommand);
    expect(remove.input).toMatchObject({ Bucket: config.R2_PRIVATE_BUCKET, Key: generatedKey });
  });

  it("issues a presigned GET for 900 seconds and leaves the signing secret out of the URL", async () => {
    const send = vi.spyOn(getR2Client()!, "send").mockResolvedValue(undefined);
    const signedUrl = new URL((await getStoredAvatarUrl(key))!);
    const [head] = send.mock.calls[0]!;
    expect(head).toBeInstanceOf(HeadObjectCommand);
    expect(head.input).toMatchObject({ Bucket: config.R2_PRIVATE_BUCKET, Key: key });
    expect(signedUrl.pathname).toBe("/" + config.R2_PRIVATE_BUCKET + "/" + key);
    expect(signedUrl.searchParams.get("X-Amz-Expires")).toBe("900");
    expect(signedUrl.searchParams.has("X-Amz-Signature")).toBe(true);
    expect(signedUrl.href).not.toContain(config.R2_SECRET_ACCESS_KEY);
  });

  it("reports missing R2 objects for the local fallback", async () => {
    vi.spyOn(getR2Client()!, "send").mockRejectedValue({ $metadata: { httpStatusCode: 404 } });
    await expect(getStoredAvatarUrl(key)).resolves.toBeNull();
  });

  it.each(["../avatar.png", "directory/avatar.png", "..\\avatar.png", "name?.png"])("rejects invalid key %s before contacting R2", async (invalidKey) => {
    const send = vi.spyOn(getR2Client()!, "send");
    await expect(getStoredAvatarUrl(invalidKey)).rejects.toMatchObject({ code: "AVATAR_NOT_FOUND" });
    await expect(removeStoredAvatar(invalidKey)).rejects.toMatchObject({ code: "AVATAR_NOT_FOUND" });
    await expect(new R2AvatarStorage().save(invalidKey, jpeg, "image/jpeg")).rejects.toMatchObject({ code: "AVATAR_NOT_FOUND" });
    expect(send).not.toHaveBeenCalled();
  });
});
