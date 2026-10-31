import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";

export type LightingInput = {
  areaM2: number;
  roomType: string;
  ceilingHeightM: number;
  clearanceHeightM?: number;
  tolerancePercent?: number;
};

export class LightingRuleNotFoundError extends Error {
  constructor(roomType: string) {
    super(`No lighting rule is configured for room type: ${roomType}`);
    this.name = "LightingRuleNotFoundError";
  }
}

export function calculateRecommendedLumens(areaM2: number, lumenPerM2: number): number {
  return Math.ceil(areaM2 * lumenPerM2);
}

type AttributeValue = { attribute: { key: string }; value: Prisma.JsonValue };

function mergeAttributes(base: readonly AttributeValue[], overrides: readonly AttributeValue[]): AttributeValue[] {
  const values = new Map(base.map((attribute) => [normalizedKey(attribute.attribute.key), attribute]));
  for (const attribute of overrides) values.set(normalizedKey(attribute.attribute.key), attribute);
  return [...values.values()];
}

function normalizedKey(key: string): string {
  return key.toLowerCase().replaceAll(/[^a-z0-9]/g, "");
}

function numericAttribute(attributes: readonly AttributeValue[], keys: string[]): number | undefined {
  const wanted = new Set(keys.map(normalizedKey));
  for (const attribute of attributes) {
    if (!wanted.has(normalizedKey(attribute.attribute.key))) continue;
    const value = typeof attribute.value === "number" ? attribute.value : typeof attribute.value === "string" ? Number(attribute.value) : NaN;
    if (Number.isFinite(value) && value >= 0) return value;
  }
  return undefined;
}

function valueIsPendant(attributes: readonly AttributeValue[]): boolean {
  return attributes.some(({ attribute, value }) => {
    const key = normalizedKey(attribute.key);
    return ["fixturetype", "mountingtype", "installationtype"].includes(key)
      && typeof value === "string" && /pendant|hanging|tha/i.test(value);
  });
}

function fitsClearance(attributes: readonly AttributeValue[], categorySlugs: string[], ceilingHeightM: number, clearanceHeightM: number): boolean {
  if (!categorySlugs.some((slug) => slug.includes("tha")) && !valueIsPendant(attributes)) return true;
  const maxDropMm = numericAttribute(attributes, ["max_hanging_length_mm", "hanging_length_max_mm", "max_drop_mm", "hanging_length_mm"]);
  const fixtureHeightMm = numericAttribute(attributes, ["fixture_height_mm", "overall_height_mm", "height_mm"]);
  if (maxDropMm === undefined || fixtureHeightMm === undefined) return false;
  return (maxDropMm + fixtureHeightMm) / 1000 <= ceilingHeightM - clearanceHeightM;
}

export function isFixtureWithinClearance(attributes: readonly AttributeValue[], categorySlugs: string[], ceilingHeightM: number, clearanceHeightM: number): boolean {
  return fitsClearance(attributes, categorySlugs, ceilingHeightM, clearanceHeightM);
}

export async function calculateLighting(input: LightingInput) {
  const rule = await prisma.lightingRule.findUnique({ where: { roomType: input.roomType } });
  if (!rule) throw new LightingRuleNotFoundError(input.roomType);

  const recommendedLumens = calculateRecommendedLumens(input.areaM2, rule.lumenPerM2);
  const tolerance = (input.tolerancePercent ?? 20) / 100;
  const minLumens = Math.ceil(recommendedLumens * (1 - tolerance));
  const maxLumens = Math.ceil(recommendedLumens * (1 + tolerance));
  const products = await prisma.product.findMany({
    where: { status: "ACTIVE", isActive: true, variants: { some: { isAvailable: true, stockQty: { gt: 0 } } } },
    select: {
      id: true, slug: true, name: true, minPriceVnd: true,
      categories: { select: { category: { select: { slug: true } } } },
      attributes: { select: { attribute: { select: { key: true } }, value: true } },
      variants: {
        where: { isAvailable: true, stockQty: { gt: 0 } },
        select: {
          id: true, sku: true, priceVnd: true, stockQty: true,
          attributes: { select: { attribute: { select: { key: true } }, value: true } },
        },
      },
    },
  });

  const matchingProducts = products.flatMap((product) => {
    const categorySlugs = product.categories.map(({ category }) => category.slug);
    return product.variants.flatMap((variant) => {
      const attributes = mergeAttributes(product.attributes, variant.attributes);
      const lumens = numericAttribute(attributes, ["lumen", "lumens", "luminous_flux"]);
      if (lumens === undefined || lumens < minLumens || lumens > maxLumens) return [];
      if (!fitsClearance(attributes, categorySlugs, input.ceilingHeightM, input.clearanceHeightM ?? 2.1)) return [];
      return [{
        productId: product.id,
        slug: product.slug,
        name: product.name,
        variantId: variant.id,
        sku: variant.sku,
        priceVnd: variant.priceVnd,
        stockQty: variant.stockQty,
        lumens,
      }];
    });
  });

  const candidateBundles = await prisma.bundle.findMany({
    where: { isActive: true, items: { some: {} } },
    select: {
      id: true, slug: true, name: true, discountVnd: true,
      items: {
        select: {
          quantity: true,
          product: {
            select: {
              id: true, name: true,
              categories: { select: { category: { select: { slug: true } } } },
              attributes: { select: { attribute: { select: { key: true } }, value: true } },
              variants: { where: { isAvailable: true, stockQty: { gt: 0 } }, select: { id: true, sku: true, priceVnd: true, stockQty: true, attributes: { select: { attribute: { select: { key: true } }, value: true } } } },
            },
          },
          variant: {
            select: {
              id: true, sku: true, priceVnd: true, stockQty: true,
              attributes: { select: { attribute: { select: { key: true } }, value: true } },
              product: {
                select: {
                  id: true, name: true,
                  categories: { select: { category: { select: { slug: true } } } },
                  attributes: { select: { attribute: { select: { key: true } }, value: true } },
                },
              },
            },
          },
        },
      },
    },
  });
  const matchingBundles = candidateBundles.flatMap((bundle) => {
    let totalLumens = 0;
    let valid = true;
    for (const item of bundle.items) {
      const product = item.product ?? item.variant?.product;
      const variant = item.variant ?? item.product?.variants.find((candidate) => numericAttribute([...item.product!.attributes, ...candidate.attributes], ["lumen", "lumens", "luminous_flux"]) !== undefined);
      if (!product || !variant || variant.stockQty < item.quantity) { valid = false; break; }
      const attributes = mergeAttributes(product.attributes, variant.attributes);
      const lumens = numericAttribute(attributes, ["lumen", "lumens", "luminous_flux"]);
      if (lumens === undefined || !fitsClearance(attributes, product.categories.map(({ category }) => category.slug), input.ceilingHeightM, input.clearanceHeightM ?? 2.1)) { valid = false; break; }
      totalLumens += lumens * item.quantity;
    }
    if (!valid || totalLumens < minLumens || totalLumens > maxLumens) return [];
    return [{ id: bundle.id, slug: bundle.slug, name: bundle.name, discountVnd: bundle.discountVnd, totalLumens }];
  });

  return {
    roomType: rule.roomType,
    areaM2: input.areaM2,
    ceilingHeightM: input.ceilingHeightM,
    lumenPerM2: rule.lumenPerM2,
    recommendedLumens,
    acceptedLumens: { min: minLumens, max: maxLumens },
    products: matchingProducts,
    bundles: matchingBundles,
  };
}
