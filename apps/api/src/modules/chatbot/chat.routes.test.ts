import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import cookieParser from "cookie-parser";
import type { AddressInfo } from "node:net";
import { errorHandler } from "../../http/errors.js";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    $transaction: vi.fn(),
    chatSession: { findUnique: vi.fn(), create: vi.fn() },
    chatMessage: { count: vi.fn(), findMany: vi.fn(), create: vi.fn() },
    setting: { findUnique: vi.fn() },
    aiUsage: { findUnique: vi.fn(), aggregate: vi.fn() },
    product: { findMany: vi.fn() },
  },
}));
vi.mock("../../lib/prisma.js", () => ({ prisma: prismaMock }));
vi.mock("../../http/customer-auth.js", () => ({ optionalCustomer: (_request: unknown, _response: unknown, next: () => void) => next() }));
const { chatRouter } = await import("./chat.routes.js");

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use("/chat", chatRouter);
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
  prismaMock.$transaction.mockReset();
  prismaMock.$transaction.mockImplementation(async (callback: (tx: typeof prismaMock) => unknown) => callback(prismaMock));
  prismaMock.chatSession.findUnique.mockReset();
  prismaMock.chatSession.create.mockReset();
  prismaMock.chatMessage.count.mockReset();
  prismaMock.chatMessage.findMany.mockReset();
  prismaMock.chatMessage.create.mockReset();
  prismaMock.setting.findUnique.mockReset();
  prismaMock.aiUsage.findUnique.mockReset();
  prismaMock.aiUsage.aggregate.mockReset();
  prismaMock.product.findMany.mockReset();
  prismaMock.chatSession.findUnique.mockResolvedValue(null);
  prismaMock.chatSession.create.mockImplementation(({ data }: { data: { sessionId: string; userId: null } }) => Promise.resolve({ id: "session-db-id", ...data }));
  prismaMock.chatMessage.count.mockResolvedValue(0);
  prismaMock.chatMessage.findMany.mockResolvedValue([]);
  prismaMock.chatMessage.create.mockResolvedValue({ id: "assistant-message-id" });
  prismaMock.setting.findUnique.mockResolvedValue(null);
  prismaMock.product.findMany.mockResolvedValue([{
    id: "product-id", slug: "den-op-tran", name: "Đèn ốp trần", description: "Đèn mẫu", minPriceVnd: 1000000,
    categories: [], spaces: [], styles: [], images: [], attributes: [],
    variants: [{ id: "variant-id", sku: "OT-1", priceVnd: 1000000, stockQty: 2, attributes: [] }],
  }]);
});

describe("chat message endpoint", () => {
  it("redacts personal data from persisted conversation messages", async () => {
    const response = await fetch(`${baseUrl}/chat/messages`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "Tìm đèn ốp trần. Gọi tôi 0912 345 678 hoặc demo@example.com" }),
    });
    const body = await response.json() as { success: boolean; data: { messageId: string; limitedMode: boolean; answer: string } };
    const saved = prismaMock.chatMessage.create.mock.calls.map((call) => call[0]);
    expect(response.status).toBe(200);
    expect(body.data.limitedMode).toBe(true);
    expect(body.data.messageId).toBe("assistant-message-id");
    expect(body.data.answer).toContain("Đèn ốp trần");
    expect(JSON.stringify(saved)).not.toContain("0912 345 678");
    expect(JSON.stringify(saved)).not.toContain("demo@example.com");
  });

  it("rejects oversized user messages before creating a chat session", async () => {
    const response = await fetch(`${baseUrl}/chat/messages`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "x".repeat(501) }),
    });
    expect(response.status).toBe(400);
    expect(prismaMock.chatSession.create).not.toHaveBeenCalled();
  });
});
