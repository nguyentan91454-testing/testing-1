import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadCustomerAvatar, resetCustomerAvatarCache } from "./customer-avatar.js";

const fetchMock = vi.fn();
const imageUrl = "https://lh3.googleusercontent.com/a/test-avatar=s96-c";
beforeEach(() => {
  resetCustomerAvatarCache();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("Google customer avatar loader", () => {
  it.each([null, "", "http://lh3.googleusercontent.com/a", "https://example.com/a",
    "https://lh3.googleusercontent.com.evil.test/a", "https://googleusercontent.com@127.0.0.1/a",
    "https://lh3.googleusercontent.com:8443/a"])("rejects untrusted sources without fetching: %s", async (source) => {
    await expect(loadCustomerAvatar(source)).rejects.toMatchObject({ status: 404 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("loads an image without forwarding cookies/referrer and reuses its server cache", async () => {
    fetchMock.mockResolvedValue(new Response(new Uint8Array([1, 2, 3]), { headers: { "content-type": "image/png" } }));
    const image = await loadCustomerAvatar(imageUrl);
    expect(image.contentType).toBe("image/png");
    expect(image.bytes).toEqual(Buffer.from([1, 2, 3]));
    expect(fetchMock).toHaveBeenCalledWith(new URL(imageUrl), { redirect: "error", signal: expect.any(AbortSignal) });
    await loadCustomerAvatar(imageUrl);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("merges simultaneous header/profile requests into a single upstream request", async () => {
    fetchMock.mockResolvedValue(new Response(new Uint8Array([1]), { headers: { "content-type": "image/jpeg" } }));
    const [a, b] = await Promise.all([loadCustomerAvatar(imageUrl), loadCustomerAvatar(imageUrl)]);
    expect(a.bytes).toEqual(b.bytes);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    () => new Response("rate limited", { status: 429 }),
    () => new Response("<svg/>", { headers: { "content-type": "image/svg+xml" } }),
    () => new Response("html", { headers: { "content-type": "text/html" } }),
    () => new Response(new Uint8Array(512 * 1024 + 1), { headers: { "content-type": "image/png" } }),
  ])("rejects rate limits, active documents and oversized files", async (response) => {
    fetchMock.mockResolvedValue(response());
    await expect(loadCustomerAvatar(imageUrl)).rejects.toMatchObject({ status: 502, code: "AVATAR_UNAVAILABLE" });
  });

  it("keeps a valid cached image if Google rate limits a later refresh", async () => {
    vi.useFakeTimers();
    fetchMock.mockResolvedValueOnce(new Response(new Uint8Array([1]), { headers: { "content-type": "image/png" } }));
    await loadCustomerAvatar(imageUrl);
    vi.advanceTimersByTime(61 * 60_000);
    fetchMock.mockResolvedValueOnce(new Response("", { status: 429 }));
    expect((await loadCustomerAvatar(imageUrl)).bytes).toEqual(Buffer.from([1]));
  });

  it("does not reuse one account's image for another source", async () => {
    fetchMock.mockImplementation(async () => new Response(new Uint8Array([1]), { headers: { "content-type": "image/png" } }));
    await loadCustomerAvatar(imageUrl);
    await loadCustomerAvatar("https://lh3.googleusercontent.com/a/other-avatar");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
