export type OrderEmailType = "ORDER_CONFIRMATION" | "PAYMENT_RECEIVED" | "ORDER_SHIPPED" | "ORDER_CANCELLED";

export interface EmailOrder {
  code: string;
  customerName: string;
  email: string;
  totalVnd: number;
  paidVnd: number;
  codAmountVnd: number;
  orderStatus: string;
  items: Array<{ productName: string; variantName: string | null; unitPriceVnd: number; quantity: number }>;
  shipment?: { trackingCode: string | null } | null;
}

export interface RenderedEmail {
  subject: string;
  text: string;
  html: string;
}

const money = (value: number) => `${new Intl.NumberFormat("vi-VN").format(value)} đ`;
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);

function layout(title: string, bodyText: string, bodyHtml: string): RenderedEmail {
  return {
    subject: title,
    text: `${title}\n\n${bodyText}\n\nNhà Mình` ,
    html: `<!doctype html><html lang="vi"><body style="margin:0;background:#f3f5f4;color:#202725;font-family:Arial,sans-serif"><main style="max-width:600px;margin:24px auto;padding:28px;background:#fff"><p style="color:#087f68;font-weight:700">NHÀ MÌNH</p><h1 style="font-size:22px">${escapeHtml(title)}</h1>${bodyHtml}<p style="margin-top:28px;color:#66716d">Cảm ơn bạn đã tin tưởng Nhà Mình.</p></main></body></html>`,
  };
}

function itemRows(order: EmailOrder): { text: string; html: string } {
  return {
    text: order.items.map((item) => `- ${item.productName}${item.variantName ? ` (${item.variantName})` : ""} x ${item.quantity}: ${money(item.unitPriceVnd * item.quantity)}`).join("\n"),
    html: `<ul>${order.items.map((item) => `<li>${escapeHtml(item.productName)}${item.variantName ? ` (${escapeHtml(item.variantName)})` : ""} × ${item.quantity}: ${money(item.unitPriceVnd * item.quantity)}</li>`).join("")}</ul>`,
  };
}

export function renderOrderEmail(type: OrderEmailType, order: EmailOrder): RenderedEmail {
  const name = escapeHtml(order.customerName);
  const code = escapeHtml(order.code);
  const items = itemRows(order);
  switch (type) {
    case "ORDER_CONFIRMATION":
      return layout(`Nhà Mình đã nhận đơn ${order.code}`, `Chào ${order.customerName},\nĐơn ${order.code} đã được ghi nhận.\n${items.text}\nTổng đơn: ${money(order.totalVnd)}\nĐã thanh toán: ${money(order.paidVnd)}\nCòn thu: ${money(order.codAmountVnd)}`, `<p>Chào ${name}, đơn <strong>${code}</strong> đã được ghi nhận.</p>${items.html}<p>Tổng đơn: <strong>${money(order.totalVnd)}</strong><br>Đã thanh toán: ${money(order.paidVnd)}<br>Còn thu: ${money(order.codAmountVnd)}</p>`);
    case "PAYMENT_RECEIVED":
      return layout(`Đã nhận thanh toán đơn ${order.code}`, `Chào ${order.customerName},\nNhà Mình đã nhận thanh toán cho đơn ${order.code}.\nĐã thanh toán: ${money(order.paidVnd)}\nCòn thu khi giao: ${money(order.codAmountVnd)}`, `<p>Chào ${name}, Nhà Mình đã nhận thanh toán cho đơn <strong>${code}</strong>.</p><p>Đã thanh toán: <strong>${money(order.paidVnd)}</strong><br>Còn thu khi giao: ${money(order.codAmountVnd)}</p>`);
    case "ORDER_SHIPPED": {
      const trackingCode = order.shipment?.trackingCode;
      return layout(`Đơn ${order.code} đang được giao`, `Chào ${order.customerName},\nĐơn ${order.code} đã được bàn giao cho đơn vị vận chuyển.${trackingCode ? `\nMã vận đơn: ${trackingCode}` : ""}`, `<p>Chào ${name}, đơn <strong>${code}</strong> đã được bàn giao cho đơn vị vận chuyển.</p>${trackingCode ? `<p>Mã vận đơn: <strong>${escapeHtml(trackingCode)}</strong></p>` : ""}`);
    }
    case "ORDER_CANCELLED":
      return layout(`Đơn ${order.code} đã được hủy`, `Chào ${order.customerName},\nĐơn ${order.code} đã được hủy. Nếu bạn cần hỗ trợ, vui lòng liên hệ Nhà Mình.`, `<p>Chào ${name}, đơn <strong>${code}</strong> đã được hủy.</p><p>Nếu bạn cần hỗ trợ, vui lòng liên hệ Nhà Mình.</p>`);
  }
}
