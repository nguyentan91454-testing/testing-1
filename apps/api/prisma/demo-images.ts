import { createHash } from "node:crypto";
import type { PrismaClient } from "@prisma/client";

const sceneBySpace: Record<string, string> = {
  bep: "photo-1556911220-e15b29be8c8f",
  "ban-an": "photo-1600607687939-ce8a6c25118c",
  "phong-ngu": "photo-1616486338812-3dadae4b4ace",
  "phong-khach": "photo-1600210492486-724fe5c67fb0",
  "phong-lam-viec": "photo-1600607687920-4e2a09cf159d",
};

export async function ensureDemoProductImage(
  prisma: PrismaClient,
  product: { id: string; name: string },
  space: string,
) {
  if (await prisma.productImage.findFirst({ where: { productId: product.id }, select: { id: true } })) return;
  const photo = sceneBySpace[space] ?? "photo-1616486029423-aaa4789e8c9a";
  const hash = createHash("sha256").update("demo-scene:" + product.id).digest("hex");
  const id = [hash.slice(0, 8), hash.slice(8, 12), hash.slice(12, 16), hash.slice(16, 20), hash.slice(20, 32)].join("-");
  await prisma.productImage.upsert({
    where: { id }, update: {},
    create: {
      id, productId: product.id, url: "/images/scenes/" + photo + ".jpg",
      alt: "Không gian minh họa cho " + product.name + "; không phải ảnh chụp sản phẩm.",
      kind: "scene", sortOrder: 0,
      sourceUrl: "https://images.unsplash.com/" + photo,
      license: "Unsplash License — https://unsplash.com/license",
    },
  });
}
