import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import type { AddressInfo } from "node:net";
import { errorHandler } from "../../http/errors.js";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    $transaction: vi.fn(),
    order: { findUnique: vi.fn() },
    orderNote: { create: vi.fn() },
    orderEvent: { create: vi.fn() },
    auditLog: { create: vi.fn() },
  },
}));
vi.mock("../../lib/prisma.js", () => ({ prisma: prismaMock }));

const { adminOrderNotesRouter } = await import("./admin.order-notes.routes.js");
const app = express();
app.use(express.json());
app.use((request, _response, next) => {
  (request as typeof request & { admin: { id: string; sessionId: string } }).admin = { id: "admin-id", sessionId: "admin-session" };
  next();
});
app.use("/admin", adminOrderNotesRouter);
app.use(errorHandler);

let server: ReturnType<typeof app.listen>;
let baseUrl: string;
const orderId = "00000000-0000-4000-8000-000000000001";

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
  prismaMock.orderNote.create.mockReset();
  prismaMock.orderEvent.create.mockReset();
  prismaMock.auditLog.create.mockReset();
  prismaMock.$transaction.mockImplementation(async (callback: (tx: typeof prismaMock) => unknown) => callback(prismaMock));
  prismaMock.order.findUnique.mockResolvedValue({ id: orderId });
  prismaMock.orderNote.create.mockResolvedValue({ id: "note-id", orderId, content: "Gọi khách xác nhận mẫu", actor: "admin:admin-id", createdAt: new Date() });
  prismaMock.orderEvent.create.mockResolvedValue({ id: "event-id" });
  prismaMock.auditLog.create.mockResolvedValue({ id: "audit-id" });
});

describe("admin order notes", () => {
  it("creates an internal note, a timeline reference, and an audit record", async () => {
    const response = await fetch(`${baseUrl}/admin/orders/${orderId}/notes`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content: "Gọi khách xác nhận mẫu" }),
    });
    expect(response.status).toBe(201);
    expect(prismaMock.orderNote.create).toHaveBeenCalledWith({ data: { orderId, content: "Gọi khách xác nhận mẫu", actor: "admin:admin-id" } });
    expect(prismaMock.orderEvent.create).toHaveBeenCalledWith({ data: { orderId, type: "INTERNAL_NOTE_ADDED", actor: "admin:admin-id", payload: { noteId: "note-id" } } });
    expect(prismaMock.auditLog.create).toHaveBeenCalledOnce();
  });

  it("rejects blank notes and does not write them", async () => {
    const response = await fetch(`${baseUrl}/admin/orders/${orderId}/notes`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content: "  " }),
    });
    expect(response.status).toBe(400);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("returns not found and performs no note writes for an unknown order", async () => {
    prismaMock.order.findUnique.mockResolvedValue(null);
    const response = await fetch(`${baseUrl}/admin/orders/${orderId}/notes`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content: "Kiểm tra" }),
    });
    expect(response.status).toBe(404);
    expect(prismaMock.orderNote.create).not.toHaveBeenCalled();
  });
});
