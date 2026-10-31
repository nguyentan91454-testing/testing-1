import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import type { AddressInfo } from "node:net";
import { errorHandler } from "../../http/errors.js";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    category: { findMany: vi.fn() },
    space: { findMany: vi.fn() },
    style: { findMany: vi.fn() },
  },
}));
vi.mock("../../lib/prisma.js", () => ({ prisma: prismaMock }));

const { taxonomyRouter } = await import("./taxonomy.routes.js");
const app = express();
app.use("/api/v1", taxonomyRouter);
app.use(errorHandler);

let server: ReturnType<typeof app.listen>;
let baseUrl: string;

beforeAll(async () => {
  server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

beforeEach(() => {
  prismaMock.category.findMany.mockReset().mockResolvedValue([{ id: "category-id", slug: "lighting", name: "Lighting", sortOrder: 1 }]);
  prismaMock.space.findMany.mockReset().mockResolvedValue([{ id: "space-id", slug: "living-room", name: "Living room", imageUrl: null, sortOrder: 1 }]);
  prismaMock.style.findMany.mockReset().mockResolvedValue([{ id: "style-id", slug: "modern", name: "Modern", imageUrl: null, sortOrder: 1 }]);
});

describe("public taxonomy endpoints", () => {
  it("returns active categories in display order", async () => {
    const response = await fetch(`${baseUrl}/api/v1/categories`);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ data: [{ slug: "lighting", name: "Lighting" }] });
    expect(prismaMock.category.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }));
  });

  it.each([["spaces", "space", "living-room"], ["styles", "style", "modern"]] as const)("returns ordered %s for menu filters", async (path, delegate, slug) => {
    const response = await fetch(`${baseUrl}/api/v1/${path}`);
    const body = await response.json() as { data: Array<{ slug: string }> };
    expect(response.status).toBe(200);
    expect(body.data[0]?.slug).toBe(slug);
    expect(prismaMock[delegate].findMany).toHaveBeenCalledWith(expect.objectContaining({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }));
  });
});
