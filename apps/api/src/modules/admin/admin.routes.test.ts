import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import express from "express";
import type { AddressInfo } from "node:net";
import { errorHandler } from "../../http/errors.js";

const { prismaMock } = vi.hoisted(() => ({ prismaMock: { $transaction: vi.fn() } }));
vi.mock("../../lib/prisma.js", () => ({ prisma: prismaMock }));

const { adminCatalogRouter } = await import("./admin.catalog.routes.js");
const { adminSettingsRouter } = await import("./admin.settings.routes.js");
const { adminReportsRouter } = await import("./admin.reports.routes.js");

const app = express();
app.use(express.json());
app.use((request, _response, next) => {
  (request as typeof request & { admin: { id: string; sessionId: string } }).admin = { id: "admin-id", sessionId: "session-id" };
  next();
});
app.use("/catalog", adminCatalogRouter);
app.use("/settings", adminSettingsRouter);
app.use("/reports", adminReportsRouter);
app.use(errorHandler);

let server: ReturnType<typeof app.listen>;
let baseUrl: string;

beforeAll(async () => {
  server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

describe("admin API validation", () => {
  it("requires a product variant before activating a product", async () => {
    const response = await fetch(`${baseUrl}/catalog/products`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug: "lamp-one", name: "Lamp One", description: "Description", status: "ACTIVE" }),
    });
    expect(response.status).toBe(400);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("rejects non-http image sources before writing to the database", async () => {
    const response = await fetch(`${baseUrl}/catalog/products/00000000-0000-4000-8000-000000000001/images`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: "javascript:alert(1)", alt: "unsafe" }),
    });
    expect(response.status).toBe(400);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("rejects report ranges longer than one year without running report queries", async () => {
    const response = await fetch(`${baseUrl}/reports/summary?from=2024-01-01&to=2026-01-01`);
    expect(response.status).toBe(400);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("rejects invalid setting keys before writing", async () => {
    const response = await fetch(`${baseUrl}/settings/Bad-Key`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ value: { enabled: true } }),
    });
    expect(response.status).toBe(400);
  });
});
