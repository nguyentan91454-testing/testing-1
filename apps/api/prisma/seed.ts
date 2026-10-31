import { PrismaClient, ProductStatus } from "@prisma/client";
import argon2 from "argon2";
import dotenv from "dotenv";
import { resolve } from "node:path";

dotenv.config({ path: resolve(process.cwd(), "../../.env") });

const prisma = new PrismaClient();

const products = [
  { slug: "den-tha-may-tre", name: "Đèn thả mây tre An Nhiên", sku: "AN-NH-01", priceVnd: 1_290_000, category: "den-tha", space: "ban-an", style: "indochine", description: "Đèn thả chao mây đan thủ công, ánh sáng ấm cho bàn ăn và không gian nghỉ ngơi.", lumen: 1800, fixtureType: "pendant", maxHangingLengthMm: 1200, fixtureHeightMm: 350 },
  { slug: "den-ban-go-soi", name: "Đèn bàn gỗ sồi Mộc", sku: "MO-DB-01", priceVnd: 890_000, category: "den-ban", space: "phong-ngu", style: "bac-au", description: "Đèn bàn chân gỗ sồi, thiết kế gọn nhẹ phù hợp bàn đầu giường.", lumen: 500, fixtureType: "table", maxHangingLengthMm: null, fixtureHeightMm: null },
  { slug: "den-op-tran-luna", name: "Đèn ốp trần Luna", sku: "LU-OT-01", priceVnd: 1_650_000, category: "den-op-tran", space: "phong-khach", style: "hien-dai", description: "Đèn ốp trần LED tiết kiệm điện, thiết kế tối giản cho căn hộ hiện đại.", lumen: 2400, fixtureType: "ceiling", maxHangingLengthMm: null, fixtureHeightMm: 90 },
];

async function main() {
  const bootstrapEmail = process.env.ADMIN_BOOTSTRAP_EMAIL ?? "admin@example.test";
  const bootstrapPassword = process.env.ADMIN_BOOTSTRAP_PASSWORD;
  if (!bootstrapPassword || bootstrapPassword.length < 12) throw new Error("Set ADMIN_BOOTSTRAP_PASSWORD (at least 12 characters) before seeding the admin account");
  await prisma.adminUser.upsert({
    where: { email: bootstrapEmail.toLowerCase() },
    update: {},
    create: { email: bootstrapEmail.toLowerCase(), passwordHash: await argon2.hash(bootstrapPassword), role: "ADMIN" },
  });
  await prisma.setting.upsert({
    where: { key: "checkout_policy" },
    update: {},
    create: {
      key: "checkout_policy",
      value: {
        shippingFeeVnd: 35_000,
        freeShippingThresholdVnd: 1_000_000,
        shippingSubsidyCapVnd: 30_000,
        fullCodLimitVnd: 1_500_000,
        depositLimitVnd: 4_000_000,
        depositRatePercent: 30,
      },
    },
  });
  const lightingRules = [
    ["phong-khach", 300],
    ["phong-ngu", 150],
    ["ban-an", 250],
    ["phong-lam-viec", 400],
    ["phong-tam", 200],
    ["quan-ca-phe", 300],
  ] as const;
  for (const [roomType, lumenPerM2] of lightingRules) {
    await prisma.lightingRule.upsert({
      where: { roomType },
      update: { lumenPerM2 },
      create: { roomType, lumenPerM2, notes: "Hệ số khuyến nghị, có thể điều chỉnh trong Admin." },
    });
  }
  const technicalAttributes = [
    { key: "lumen", label: "Quang thông", type: "NUMBER", unit: "lm" },
    { key: "fixture_type", label: "Kiểu lắp đặt", type: "STRING", unit: null },
    { key: "max_hanging_length_mm", label: "Chiều dài dây thả tối đa", type: "NUMBER", unit: "mm" },
    { key: "fixture_height_mm", label: "Chiều cao thân đèn", type: "NUMBER", unit: "mm" },
  ] as const;
  for (const attribute of technicalAttributes) {
    await prisma.attributeDefinition.upsert({ where: { key: attribute.key }, update: { label: attribute.label, type: attribute.type, unit: attribute.unit }, create: attribute });
  }
  const categoryNames: Record<string, string> = { "den-tha": "Đèn thả", "den-ban": "Đèn bàn", "den-op-tran": "Đèn ốp trần" };
  for (const [slug, name] of Object.entries(categoryNames)) {
    await prisma.category.upsert({ where: { slug }, update: { name }, create: { slug, name, isActive: true } });
  }
  const spaces = [ ["ban-an", "Bàn ăn"], ["phong-ngu", "Phòng ngủ"], ["phong-khach", "Phòng khách"] ] as const;
  for (const [slug, name] of spaces) await prisma.space.upsert({ where: { slug }, update: { name }, create: { slug, name } });
  const styles = [ ["indochine", "Indochine"], ["bac-au", "Bắc Âu"], ["hien-dai", "Hiện đại"] ] as const;
  for (const [slug, name] of styles) await prisma.style.upsert({ where: { slug }, update: { name }, create: { slug, name } });
  const brand = await prisma.brand.upsert({ where: { slug: "nha-minh" }, update: { name: "Nhà Mình" }, create: { slug: "nha-minh", name: "Nhà Mình" } });

  for (const item of products) {
    const category = await prisma.category.findUniqueOrThrow({ where: { slug: item.category } });
    const product = await prisma.product.upsert({
      where: { slug: item.slug },
      update: { name: item.name, description: item.description, minPriceVnd: item.priceVnd, status: ProductStatus.ACTIVE, isActive: true },
      create: { slug: item.slug, name: item.name, description: item.description, brandId: brand.id, minPriceVnd: item.priceVnd, status: ProductStatus.ACTIVE, isActive: true },
    });
    const attributeRows = [
      ["lumen", item.lumen],
      ["fixture_type", item.fixtureType],
      ...(item.maxHangingLengthMm === null ? [] : [["max_hanging_length_mm", item.maxHangingLengthMm] as const]),
      ...(item.fixtureHeightMm === null ? [] : [["fixture_height_mm", item.fixtureHeightMm] as const]),
    ] as const;
    for (const [key, value] of attributeRows) {
      const definition = await prisma.attributeDefinition.findUniqueOrThrow({ where: { key } });
      await prisma.productAttribute.upsert({
        where: { productId_attributeId: { productId: product.id, attributeId: definition.id } },
        update: { value },
        create: { productId: product.id, attributeId: definition.id, value },
      });
    }
    await prisma.productCategory.upsert({
      where: { productId_categoryId: { productId: product.id, categoryId: category.id } },
      update: {},
      create: { productId: product.id, categoryId: category.id },
    });
    await prisma.variant.upsert({
      where: { sku: item.sku },
      update: { productId: product.id, priceVnd: item.priceVnd, stockQty: 10, isAvailable: true },
      create: { productId: product.id, sku: item.sku, priceVnd: item.priceVnd, stockQty: 10, isAvailable: true, weightG: 1_200, packLengthMm: 300, packWidthMm: 300, packHeightMm: 350 },
    });
    const space = await prisma.space.findUniqueOrThrow({ where: { slug: item.space } });
    await prisma.productSpace.upsert({ where: { productId_spaceId: { productId: product.id, spaceId: space.id } }, update: {}, create: { productId: product.id, spaceId: space.id } });
    const style = await prisma.style.findUniqueOrThrow({ where: { slug: item.style } });
    await prisma.productStyle.upsert({ where: { productId_styleId: { productId: product.id, styleId: style.id } }, update: {}, create: { productId: product.id, styleId: style.id } });
  }
}

main().finally(async () => prisma.$disconnect());

