import type { PrismaClient } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ensureDemoProductImage } from "../../../prisma/demo-images.js";
import { publicCatalogImage, publicCatalogImageUrl } from "./catalog-image.js";

const { config } = vi.hoisted(() => ({ config: { R2_PUBLIC_BASE_URL: "" } }));
vi.mock("../../config/env.js", () => ({ env: config }));
beforeEach(() => { config.R2_PUBLIC_BASE_URL = ""; });

describe("catalog image URLs", () => {
  const localPath = "/images/scenes/photo-1556911220-e15b29be8c8f.jpg";
  const product = { id: "sample", name: "Test product" };

  it("seeds a portable local path and retains its source and license without R2", async () => {
    const upsert = vi.fn();
    const prisma = { productImage: { findFirst: vi.fn().mockResolvedValue(null), upsert } } as unknown as PrismaClient;
    await ensureDemoProductImage(prisma, product, "bep");
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
      update: {}, create: expect.objectContaining({ url: localPath, sourceUrl: expect.stringContaining("unsplash.com"), license: expect.stringContaining("Unsplash License") }),
    }));
    expect(publicCatalogImageUrl(localPath)).toBe(localPath);
  });

  it("resolves bundled images to the configured R2 origin without changing metadata", () => {
    config.R2_PUBLIC_BASE_URL = "https://pub-example.r2.dev";
    const metadata = { sourceUrl: "https://images.unsplash.com/example", license: "Unsplash License", author: null };
    expect(publicCatalogImage({ url: localPath, ...metadata })).toEqual({
      url: config.R2_PUBLIC_BASE_URL + "/scenes/photo-1556911220-e15b29be8c8f.jpg",
      ...metadata,
    });
    expect(publicCatalogImageUrl(metadata.sourceUrl)).toBe(metadata.sourceUrl);
  });

  it("does not replace an image already stored for a product", async () => {
    config.R2_PUBLIC_BASE_URL = "https://pub-example.r2.dev";
    const upsert = vi.fn();
    const prisma = { productImage: { findFirst: vi.fn().mockResolvedValue({ id: "existing-image" }), upsert } } as unknown as PrismaClient;
    await ensureDemoProductImage(prisma, product, "bep");
    expect(upsert).not.toHaveBeenCalled();
  });
});
