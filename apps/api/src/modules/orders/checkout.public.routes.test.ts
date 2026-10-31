import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import type { AddressInfo } from "node:net";
import { errorHandler } from "../../http/errors.js";

const { prismaMock, emailMock } = vi.hoisted(() => ({
  prismaMock: {
    $transaction: vi.fn(),
    order: { findUnique: vi.fn(), updateMany: vi.fn() },
    payment: { findFirst: vi.fn(), updateMany: vi.fn() },
    orderEvent: { create: vi.fn() },
  },
  emailMock: { recordOrderEmail: vi.fn(), notifyEmailWorker: vi.fn() },
}));
vi.mock("../../lib/prisma.js", () => ({ prisma: prismaMock }));
vi.mock("../email/email.service.js", () => emailMock);

const { checkoutRouter } = await import("./checkout.routes.js");
const { createOrderTrackingToken, hashOrderTrackingToken } = await import("./mock-payment.js");

const app = express();
app.use(express.json());
app.use("/orders", checkoutRouter);
app.use(errorHandler);

let server: ReturnType<typeof app.listen>;
let baseUrl: string;
const orderId = "00000000-0000-4000-8000-000000000001";
const orderCode = "DEMO-ABC-123";
const createdAt = new Date();
const tracking = createOrderTrackingToken(orderId, createdAt);
const order = {
  id: orderId, code: orderCode, trackingTokenHash: hashOrderTrackingToken(tracking.token),
  orderStatus: "PENDING", paymentStatus: "DEPOSIT_PENDING", totalVnd: 100000, paidVnd: 0,
  codAmountVnd: 0, createdAt, reservationExpiresAt: new Date(Date.now() + 60_000),
  phone: "0901234567", email: "private@example.test", addressDetail: "private address",
  items: [{ productName: "Đèn demo", variantName: null, quantity: 1 }],
  payments: [{ id: "payment-id", type: "DEPOSIT", amountVnd: 30000, status: "PENDING" }],
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
  prismaMock.payment.findFirst.mockReset();
  prismaMock.payment.updateMany.mockReset();
  prismaMock.orderEvent.create.mockReset();
  emailMock.recordOrderEmail.mockReset();
  emailMock.notifyEmailWorker.mockReset();
  prismaMock.order.findUnique.mockResolvedValue(order);
  prismaMock.order.updateMany.mockResolvedValue({ count: 1 });
  prismaMock.payment.findFirst.mockResolvedValue({ id: "payment-id", provider: "MOCK", type: "DEPOSIT", amountVnd: 30000, status: "PENDING" });
  prismaMock.payment.updateMany.mockResolvedValue({ count: 1 });
  prismaMock.orderEvent.create.mockResolvedValue({ id: "event-id" });
  emailMock.recordOrderEmail.mockResolvedValue("email-log-id");
  emailMock.notifyEmailWorker.mockResolvedValue(undefined);
  prismaMock.$transaction.mockImplementation(async (callback: (tx: typeof prismaMock) => unknown) => callback(prismaMock));
});

describe("public order tracking and mock payment", () => {
  it("requires the signed token and returns only minimal order details", async () => {
    const missingToken = await fetch(`${baseUrl}/orders/track/${orderCode}`);
    expect(missingToken.status).toBe(400);

    const response = await fetch(`${baseUrl}/orders/track/${orderCode}`, { headers: { "x-order-tracking-token": tracking.token } });
    const body = await response.json() as { data: Record<string, unknown> };
    expect(response.status).toBe(200);
    expect(body.data.code).toBe(orderCode);
    expect(body.data.items).toEqual(order.items);
    expect(JSON.stringify(body)).not.toContain(order.phone);
    expect(JSON.stringify(body)).not.toContain(order.email);
    expect(JSON.stringify(body)).not.toContain(order.addressDetail);
  });

  it("returns the current pending QR only for the matching tracking token", async () => {
    const response = await fetch(`${baseUrl}/orders/track/${orderCode}/qr`, { headers: { "x-order-tracking-token": tracking.token } });
    const body = await response.json() as { data: { amountVnd: number; qr: { payload: string } } };
    expect(response.status).toBe(200);
    expect(body.data.amountVnd).toBe(30000);
    expect(body.data.qr.payload).toBe(`DEMO-VIETQR|${orderCode}|30000`);
  });

  it("confirms a mock payment and makes repeated confirmation idempotent", async () => {
    const response = await fetch(`${baseUrl}/orders/track/${orderCode}/confirm-payment`, {
      method: "POST", headers: { "x-order-tracking-token": tracking.token },
    });
    expect(response.status).toBe(200);
    expect(prismaMock.payment.updateMany).toHaveBeenCalledWith({ where: { id: "payment-id", status: "PENDING" }, data: { status: "SUCCEEDED", providerTxnId: "MOCK-payment-id" } });
    expect(prismaMock.order.updateMany).toHaveBeenCalledOnce();
    expect(prismaMock.orderEvent.create).toHaveBeenCalledOnce();
    expect(emailMock.recordOrderEmail).toHaveBeenCalledOnce();

    prismaMock.order.findUnique.mockResolvedValueOnce(order).mockResolvedValueOnce({ ...order, paymentStatus: "PAID", paidVnd: 30000 });
    prismaMock.payment.findFirst.mockResolvedValueOnce({ id: "payment-id", provider: "MOCK", type: "DEPOSIT", amountVnd: 30000, status: "SUCCEEDED" });
    const repeated = await fetch(`${baseUrl}/orders/track/${orderCode}/confirm-payment`, {
      method: "POST", headers: { "x-order-tracking-token": tracking.token },
    });
    const body = await repeated.json() as { data: { alreadyProcessed: boolean } };
    expect(repeated.status).toBe(200);
    expect(body.data.alreadyProcessed).toBe(true);
    expect(prismaMock.payment.updateMany).toHaveBeenCalledOnce();
  });

  it("rejects a token used with another public order code", async () => {
    const response = await fetch(`${baseUrl}/orders/track/DEMO-OTHER-123`, { headers: { "x-order-tracking-token": tracking.token } });
    expect(response.status).toBe(404);
  });
});
