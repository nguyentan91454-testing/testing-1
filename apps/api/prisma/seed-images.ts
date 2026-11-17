import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { ensureDemoProductImage } from "./demo-images.js";

dotenv.config({ path: fileURLToPath(new URL("../../../.env", import.meta.url)) });
const prisma = new PrismaClient();
try {
  // Only backfill the known demo SKU families. Leave custom products and existing images intact.
  const products = await prisma.product.findMany({
    where: { images: { none: {} }, variants: { some: { OR: [
      { sku: { startsWith: "HA-" } }, { sku: { startsWith: "HD-" } },
      { sku: { in: ["AN-NH-01", "MO-DB-01", "LU-OT-01"] } },
    ] } } },
    select: { id: true, name: true, spaces: { select: { space: { select: { slug: true } } }, take: 1 } },
  });
  for (const product of products) await ensureDemoProductImage(prisma, product, product.spaces[0]?.space.slug ?? "");
  console.log("Added local scene illustrations for " + products.length + " demo products.");
} finally { await prisma.$disconnect(); }
