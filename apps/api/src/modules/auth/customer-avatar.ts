import { HttpError } from "../../http/errors.js";

const cache = new Map<string, { bytes: Buffer; contentType: string; expiresAt: number }>();
const pending = new Map<string, Promise<{ bytes: Buffer; contentType: string }>>();
const maxBytes = 512 * 1024;
const imageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function loadCustomerAvatar(source: string | null) {
  let url: URL;
  try { url = new URL(source ?? ""); } catch { throw new HttpError(404, "Chưa có ảnh đại diện.", "AVATAR_NOT_FOUND"); }
  // This is a private Google-avatar loader, never a general URL proxy.
  if (url.protocol !== "https:" || url.port || url.username || url.password ||
    !(url.hostname === "googleusercontent.com" || url.hostname.endsWith(".googleusercontent.com"))) {
    throw new HttpError(404, "Nguồn ảnh đại diện không được hỗ trợ.", "AVATAR_NOT_FOUND");
  }
  const key = url.href;
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached;
  if (pending.has(key)) return pending.get(key)!;
  const task = (async () => {
    try {
      const response = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(8000) });
      const contentType = response.headers.get("content-type")?.split(";")[0]?.trim() ?? "";
      if (!response.ok || !imageTypes.has(contentType) || Number(response.headers.get("content-length") ?? 0) > maxBytes || !response.body) {
        await response.body?.cancel();
        throw new Error("Avatar unavailable");
      }
      const chunks: Uint8Array[] = [];
      let size = 0;
      for await (const chunk of response.body) {
        size += chunk.length;
        if (size > maxBytes) throw new Error("Avatar too large");
        chunks.push(chunk);
      }
      if (!size) throw new Error("Empty avatar");
      const value = { bytes: Buffer.concat(chunks), contentType, expiresAt: Date.now() + 60 * 60_000 };
      if (cache.size >= 32) cache.delete(cache.keys().next().value!);
      cache.set(key, value);
      return value;
    } catch {
      if (cached) return cached; // Keep a previously valid image during Google rate limits.
      throw new HttpError(502, "Tạm thời chưa tải được ảnh Google.", "AVATAR_UNAVAILABLE");
    }
  })();
  pending.set(key, task);
  try { return await task; } finally { pending.delete(key); }
}

export function resetCustomerAvatarCache() { cache.clear(); pending.clear(); }
