import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    product: { findMany: vi.fn(), findFirst: vi.fn() },
    itemSimilarity: { findMany: vi.fn() },
    order: { findFirst: vi.fn() },
    contentChunk: { findMany: vi.fn() },
    contactRequest: { create: vi.fn() },
    lightingRule: { findUnique: vi.fn() },
    bundle: { findMany: vi.fn() },
  },
}));
vi.mock("../../lib/prisma.js", () => ({ prisma: prismaMock }));

const { executeChatTool, chatToolDeclarations } = await import("./chat.tools.js");

beforeEach(() => {
  for (const delegate of Object.values(prismaMock)) {
    for (const method of Object.values(delegate)) method.mockReset();
  }
});

describe("chat tool registry", () => {
  it("exposes exactly the seven approved tools", () => {
    expect(chatToolDeclarations.map(({ name }) => name)).toEqual([
      "search_products", "get_product_details", "calculate_lighting", "recommend_products",
      "get_order_status", "search_policies", "create_contact_request",
    ]);
  });

  it("rejects unregistered tools and malformed arguments before database access", async () => {
    await expect(executeChatTool("delete_order", {}, { sessionId: "session" })).rejects.toThrow("Tool is not allowed");
    await expect(executeChatTool("search_products", { minPrice: 20, maxPrice: 10 }, { sessionId: "session" })).rejects.toThrow();
    expect(prismaMock.product.findMany).not.toHaveBeenCalled();
  });

  it("does not query an anonymous order without separately supplied verification", async () => {
    const result = await executeChatTool("get_order_status", { orderCode: "DEMO-ABC-123456" }, { sessionId: "session" });
    expect(result).toMatchObject({ verified: false });
    expect(prismaMock.order.findFirst).not.toHaveBeenCalled();
  });

  it("uses the last four digits only in the server-side order lookup and returns minimal fields", async () => {
    prismaMock.order.findFirst.mockResolvedValue({ code: "DEMO-ABC-123456", orderStatus: "SHIPPED", paymentStatus: "PAID", totalVnd: 1000, paidVnd: 1000, codAmountVnd: 0, createdAt: new Date(), items: [] });
    const result = await executeChatTool("get_order_status", { orderCode: "DEMO-ABC-123456" }, {
      sessionId: "session", orderVerification: { code: "DEMO-ABC-123456", phoneLast4: "4321" },
    });
    expect(prismaMock.order.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { code: "DEMO-ABC-123456", phone: { endsWith: "4321" } } }));
    expect(JSON.stringify(result)).not.toContain("4321");
  });

  it("scopes signed-in order lookups to the authenticated user", async () => {
    prismaMock.order.findFirst.mockResolvedValue(null);
    await executeChatTool("get_order_status", { orderCode: "DEMO-ABC-123456" }, { sessionId: "session", customerId: "user-id" });
    expect(prismaMock.order.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { code: "DEMO-ABC-123456", userId: "user-id" } }));
  });

  it("keeps callback contact details out of the tool response", async () => {
    prismaMock.contactRequest.create.mockResolvedValue({ id: "contact-id", name: "Demo", phone: "0900000000" });
    const result = await executeChatTool("create_contact_request", { message: "Gọi lại để tư vấn" }, {
      sessionId: "session", contactDetails: { name: "Demo", phone: "0900000000" },
    });
    expect(prismaMock.contactRequest.create).toHaveBeenCalledWith({ data: { name: "Demo", phone: "0900000000", message: "Gọi lại để tư vấn" } });
    expect(JSON.stringify(result)).not.toContain("0900000000");
  });
});
