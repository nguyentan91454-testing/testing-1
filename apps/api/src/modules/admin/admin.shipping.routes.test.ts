import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import type { AddressInfo } from "node:net";
import { errorHandler } from "../../http/errors.js";

const { prismaMock, emailMock } = vi.hoisted(() => {
  const db = {
    order: { findUnique: vi.fn(), updateMany: vi.fn() },
    shipment: { findUnique: vi.fn(), create: vi.fn() },
    orderEvent: { create: vi.fn() },
    emailLog: { create: vi.fn() },
    auditLog: { create: vi.fn() },
  };
  return {
    prismaMock: { ...db, $transaction: vi.fn() },
    emailMock: { notifyEmailWorker: vi.fn(), recordOrderEmail: vi.fn() },
  };
});
vi.mock("../../lib/prisma.js", () => ({ prisma: prismaMock }));
vi.mock("../email/email.service.js", () => emailMock);

const { adminShippingRouter } = await import("./admin.shipping.routes.js");
const app = express();
app.use(express.json());
app.use((request, _response, next) => {
  (request as typeof request & { admin: { id: string; sessionId: string } }).admin = { id: "admin-id", sessionId: "admin-session" };
  next();
});
app.use("/admin", adminShippingRouter);
app.use(errorHandler);

let server: ReturnType<typeof app.listen>;
let baseUrl: string;
const orderId = "00000000-0000-4000-8000-000000000001";
const packingOrder = {
  id: orderId,
  code: "ORD-1001",
  email: "customer@example.com",
  orderStatus: "PACKING",
  paymentStatus: "COD_PENDING",
  depositRequiredVnd: 0,
  shippingFeeGrossVnd: 35_000,
  codAmountVnd: 420_000,
  shipment: null,
};

beforeAll(async () => {
  server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

beforeEach(() => {
  prismaMock.$transaction.mockReset();
  prismaMock.order.findUnique.mockReset();
  prismaMock.order.updateMany.mockReset();
  prismaMock.shipment.findUnique.mockReset();
  prismaMock.shipment.create.mockReset();
  prismaMock.orderEvent.create.mockReset();
  prismaMock.emailLog.create.mockReset();
  prismaMock.auditLog.create.mockReset();
  emailMock.notifyEmailWorker.mockReset().mockResolvedValue(undefined);
  emailMock.recordOrderEmail.mockReset().mockResolvedValue("email-log-id");
  prismaMock.$transaction.mockImplementation(async (callback: (tx: typeof prismaMock) => unknown) => callback(prismaMock));
  prismaMock.order.findUnique.mockResolvedValue(packingOrder);
  prismaMock.order.updateMany.mockResolvedValue({ count: 1 });
  prismaMock.shipment.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ id: "shipment-id", ...data }));
});

describe("admin shipping endpoints", () => {
  it("creates a mock label, ships the order, and queues a notification atomically", async () => {
    const response = await fetch(`${baseUrl}/admin/orders/${orderId}/shipment`, { method: "POST" });
    const body = await response.json() as { data: { provider: string; trackingCode: string; codAmountVnd: number } };

    expect(response.status).toBe(201);
    expect(body.data).toMatchObject({ provider: "MOCK", trackingCode: expect.stringMatching(/^MOCK-/), codAmountVnd: 420_000 });
    expect(prismaMock.order.updateMany).toHaveBeenCalledWith({
      where: { id: orderId, orderStatus: "PACKING", paymentStatus: "COD_PENDING" },
      data: { orderStatus: "SHIPPED" },
    });
    expect(prismaMock.orderEvent.create).toHaveBeenCalledOnce();
    expect(emailMock.recordOrderEmail).toHaveBeenCalledWith(prismaMock, orderId, "ORDER_SHIPPED", "customer@example.com");
    expect(emailMock.notifyEmailWorker).toHaveBeenCalledWith("email-log-id");
    expect(prismaMock.auditLog.create).toHaveBeenCalledOnce();
  });

  it("rejects orders that are not ready to ship without writing a label", async () => {
    prismaMock.order.findUnique.mockResolvedValue({ ...packingOrder, orderStatus: "CONFIRMED" });
    const response = await fetch(`${baseUrl}/admin/orders/${orderId}/shipment`, { method: "POST" });

    expect(response.status).toBe(409);
    expect(prismaMock.shipment.create).not.toHaveBeenCalled();
    expect(prismaMock.order.updateMany).not.toHaveBeenCalled();
  });

  it("requires the deposit to be paid before shipping", async () => {
    prismaMock.order.findUnique.mockResolvedValue({ ...packingOrder, depositRequiredVnd: 100_000, paymentStatus: "DEPOSIT_PENDING" });
    const response = await fetch(`${baseUrl}/admin/orders/${orderId}/shipment`, { method: "POST" });

    expect(response.status).toBe(409);
    expect(prismaMock.shipment.create).not.toHaveBeenCalled();
    expect(prismaMock.order.updateMany).not.toHaveBeenCalled();
  });

  it("returns an existing shipment for admin order detail views", async () => {
    prismaMock.order.findUnique.mockResolvedValue({ id: orderId });
    prismaMock.shipment.findUnique.mockResolvedValue({ id: "shipment-id", orderId, provider: "MOCK", trackingCode: "MOCK-1001", status: "CREATED" });
    const response = await fetch(`${baseUrl}/admin/orders/${orderId}/shipment`);

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ data: { id: "shipment-id", trackingCode: "MOCK-1001" } });
  });
});
