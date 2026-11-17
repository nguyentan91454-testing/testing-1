import { mkdir, readFile, writeFile } from "node:fs/promises";

const destination = new URL("../apps/web/public/images/scenes/", import.meta.url);
const photos = [
  ["photo-1600210492486-724fe5c67fb0", "Living room"],
  ["photo-1600607687939-ce8a6c25118c", "Dining room"],
  ["photo-1616486338812-3dadae4b4ace", "Bedroom"],
  ["photo-1600210492493-0946911123ea", "Scandinavian interior"],
  ["photo-1600607687920-4e2a09cf159d", "Modern interior"],
  ["photo-1616486029423-aaa4789e8c9a", "Home decor"],
  ["photo-1556911220-e15b29be8c8f", "Kitchen"],
];
await mkdir(destination, { recursive: true });
const credits = [];
for (const [id, description] of photos) {
  const sourceUrl = "https://images.unsplash.com/" + id + "?auto=format&fit=crop&w=1600&q=82&fm=jpg";
  const file = new URL(id + ".jpg", destination);
  const existing = await readFile(file).catch(() => null);
  if (!existing?.length) {
    const response = await fetch(sourceUrl, { signal: AbortSignal.timeout(20000) });
    if (!response.ok || !response.headers.get("content-type")?.startsWith("image/")) {
      throw new Error("Image download failed: " + id + " HTTP " + response.status);
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new Error("Expected JPEG: " + id);
    await writeFile(file, bytes);
    console.log("Downloaded", id, bytes.length, "bytes");
  }
  credits.push({ file: id + ".jpg", description, sourceUrl, source: "Unsplash", licenseUrl: "https://unsplash.com/license" });
}
await writeFile(new URL("sources.json", destination), JSON.stringify(credits, null, 2) + "\n");
console.log("Ready:", credits.length, "local scene images.");
