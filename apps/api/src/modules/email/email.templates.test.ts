import { describe, expect, it } from "vitest";
import { renderOrderEmail, type OrderEmailType } from "./email.templates.js";

const sampleOrder = {
  code: "DEMO-123",
  customerName: "<script>alert(1)</script>",
  email: "customer@example.com",
  totalVnd: 1_000_000,
  paidVnd: 300_000,
  codAmountVnd: 700_000,
  orderStatus: "PENDING",
  items: [{ productName: "Đèn <b>mây</b>", variantName: "Trắng & vàng", unitPriceVnd: 1_000_000, quantity: 1 }],
  shipment: { trackingCode: "TRACK-1" },
};

describe("order email templates", () => {
  it.each<[OrderEmailType, string]>([
    ["ORDER_CONFIRMATION", "đã nhận đơn"],
    ["PAYMENT_RECEIVED", "Đã nhận thanh toán"],
    ["ORDER_SHIPPED", "đang được giao"],
    ["ORDER_CANCELLED", "đã được hủy"],
  ])("renders %s with escaped customer and order data", (type, expectedSubject) => {
    const rendered = renderOrderEmail(type, sampleOrder);
    expect(rendered.subject).toContain(expectedSubject);
    expect(rendered.html).not.toContain("<script>");
    expect(rendered.html).toContain("&lt;script&gt;");
    if (type === "ORDER_SHIPPED") expect(rendered.html).toContain("TRACK-1");
  });
});
