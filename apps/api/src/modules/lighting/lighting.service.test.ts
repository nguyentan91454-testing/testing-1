import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    lightingRule: { findUnique: vi.fn() },
    product: { findMany: vi.fn() },
    bundle: { findMany: vi.fn() },
  },
}));
vi.mock("../../lib/prisma.js", () => ({ prisma: prismaMock }));

const { calculateLighting, calculateRecommendedLumens, isFixtureWithinClearance } = await import("./lighting.service.js");

beforeEach(() => {
  prismaMock.lightingRule.findUnique.mockReset();
  prismaMock.product.findMany.mockReset();
  prismaMock.bundle.findMany.mockReset();
});

describe("lighting calculations", () => {
  it("rounds recommended room lumens up to the next whole lumen", () => {
    expect(calculateRecommendedLumens(12.5, 300)).toBe(3750);
    expect(calculateRecommendedLumens(12.01, 300)).toBe(3603);
  });

  it("excludes hanging fixtures whose body and cable cannot clear the requested height", () => {
    const attributes = [
      { attribute: { key: "fixture_type" }, value: "pendant" },
      { attribute: { key: "max_hanging_length_mm" }, value: 1200 },
      { attribute: { key: "fixture_height_mm" }, value: 300 },
    ] as const;
    expect(isFixtureWithinClearance(attributes, [], 3.6, 2.1)).toBe(true);
    expect(isFixtureWithinClearance(attributes, [], 3.5, 2.1)).toBe(false);
  });

  it("keeps non-hanging fixtures eligible without cable metadata", () => {
    expect(isFixtureWithinClearance([], ["den-op-tran"], 2.7, 2.1)).toBe(true);
  });

  it("rejects hanging fixtures when required height metadata is incomplete", () => {
    expect(isFixtureWithinClearance([{ attribute: { key: "fixture_type" }, value: "pendant" }], [], 4, 2.1)).toBe(false);
  });

  it("uses the configured room rule and filters matching fixtures by lumen and ceiling clearance", async () => {
    prismaMock.lightingRule.findUnique.mockResolvedValue({ roomType: "ban-an", lumenPerM2: 200 });
    prismaMock.product.findMany.mockResolvedValue([{
      id: "product-1", slug: "pendant", name: "Pendant", minPriceVnd: 100000,
      categories: [{ category: { slug: "den-tha" } }],
      attributes: [
        { attribute: { key: "lumen" }, value: 1900 },
        { attribute: { key: "fixture_type" }, value: "pendant" },
        { attribute: { key: "max_hanging_length_mm" }, value: 1200 },
        { attribute: { key: "fixture_height_mm" }, value: 300 },
      ],
      variants: [{ id: "variant-1", sku: "P-1", priceVnd: 100000, stockQty: 2, attributes: [] }],
    }]);
    prismaMock.bundle.findMany.mockResolvedValue([]);

    const tooLow = await calculateLighting({ areaM2: 10, roomType: "ban-an", ceilingHeightM: 3.5 });
    const enoughHeight = await calculateLighting({ areaM2: 10, roomType: "ban-an", ceilingHeightM: 3.6 });

    expect(tooLow.recommendedLumens).toBe(2000);
    expect(tooLow.products).toHaveLength(0);
    expect(enoughHeight.products).toHaveLength(1);
    expect(enoughHeight.products[0]?.lumens).toBe(1900);
  });
});
