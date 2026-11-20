import { afterEach, describe, expect, it, vi } from "vitest";
import { removeStoredAvatar, readStoredAvatar, saveAvatar } from "./customer-avatar-storage.js";

vi.mock("../../config/env.js", () => ({ env: { R2_ACCOUNT_ID: "" } }));

const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
const created: string[] = [];
afterEach(async () => { while (created.length) await removeStoredAvatar(created.pop()); });

describe("customer avatar storage", () => {
  it("accepts a real PNG and reads it back with its content type", async () => {
    const key = await saveAvatar(png, "image/png");
    created.push(key);
    const avatar = await readStoredAvatar(key);
    expect(avatar.contentType).toBe("image/png");
    expect(avatar.bytes).toEqual(png);
  });

  it.each([
    [Buffer.from("not an image"), "image/png"],
    [png, "image/svg+xml"],
    [Buffer.alloc(5 * 1024 * 1024 + 1), "image/png"],
  ])("rejects invalid upload data", async (buffer, contentType) => {
    await expect(saveAvatar(buffer, contentType)).rejects.toMatchObject({ status: 400, code: "AVATAR_INVALID" });
  });

  it("rejects path traversal and removes an uploaded file", async () => {
    await expect(readStoredAvatar("..\\..\\secret.png")).rejects.toMatchObject({ status: 404, code: "AVATAR_NOT_FOUND" });
    const key = await saveAvatar(png, "image/png");
    created.push(key);
    await removeStoredAvatar(key);
    await expect(readStoredAvatar(key)).rejects.toMatchObject({ status: 404, code: "AVATAR_NOT_FOUND" });
    created.pop();
  });
});
