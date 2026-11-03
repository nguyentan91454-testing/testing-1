import type { Cart, CheckoutResult, LightingResult, Product, TaxonomyItem } from "../types";

export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/v1${path}`, {
    ...init,
    credentials: "include",
    headers: { "content-type": "application/json", ...init?.headers },
  });
  const body = await response.json().catch(() => null) as { data?: T; message?: string; code?: string } | null;
  if (!response.ok) throw new ApiError(body?.message ?? "Không thể kết nối máy chủ. Vui lòng thử lại.", response.status, body?.code);
  return (body?.data ?? body) as T;
}

async function requestWithMeta<T>(path: string): Promise<{ data: T; meta?: { page: number; limit: number; total: number; totalPages: number } }> {
  const response = await fetch(`/api/v1${path}`, { credentials: "include" });
  const body = await response.json().catch(() => null) as { data?: T; meta?: { page: number; limit: number; total: number; totalPages: number }; message?: string; code?: string } | null;
  if (!response.ok) throw new ApiError(body?.message ?? "Không thể kết nối máy chủ.", response.status, body?.code);
  return { data: body?.data ?? ([] as T), meta: body?.meta };
}

export const api = {
  products: (search: URLSearchParams) => request<Product[]>(`/products?${search.toString()}`),
  catalog: (search: URLSearchParams) => requestWithMeta<Product[]>(`/products?${search.toString()}`),
  product: (slug: string) => request<Product>(`/products/${encodeURIComponent(slug)}`),
  categories: () => request<TaxonomyItem[]>("/categories"),
  spaces: () => request<TaxonomyItem[]>("/spaces"),
  styles: () => request<TaxonomyItem[]>("/styles"),
  cart: () => request<Cart>("/cart"),
  addCartItem: (variantId: string, quantity: number) => request<Cart>("/cart/items", { method: "POST", body: JSON.stringify({ variantId, quantity }) }),
  updateCartItem: (itemId: string, quantity: number) => request<Cart>(`/cart/items/${itemId}`, { method: "PATCH", body: JSON.stringify({ quantity }) }),
  removeCartItem: (itemId: string) => request<Cart>(`/cart/items/${itemId}`, { method: "DELETE" }),
  clearCart: () => request<Cart>("/cart/items", { method: "DELETE" }),
  lightingRoomTypes: () => request<Array<{ roomType: string; lumenPerM2: number; notes: string | null }>>("/lighting/room-types"),
  calculateLighting: (input: { areaM2: number; roomType: string; ceilingHeightM: number; clearanceHeightM: number }) => request<LightingResult>("/lighting/calculate", { method: "POST", body: JSON.stringify(input) }),
  sendMessage: (message: string) => request<{ messageId: string; answer: string; limitedMode: boolean; latencyMs: number }>("/chat/messages", { method: "POST", body: JSON.stringify({ message }) }),
  sendChatMessage: (input: { message: string; contactDetails?: { name: string; phone: string } }) => request<{ messageId: string; answer: string; limitedMode: boolean; latencyMs: number; products?: Array<{ id: string; slug: string; name: string; priceVnd: number; image: { url: string; alt: string } | null; variantId: string | null }> }>("/chat/messages", { method: "POST", body: JSON.stringify(input) }),
  createContactRequest: (input:{name:string;phone:string;message:string}) => request<{id:string;status:string}>("/chat/contact-requests", { method:"POST", body:JSON.stringify(input) }),
  resetChat: () => request<{ sessionId: string }>("/chat/session/reset", { method: "POST" }),
  chatFeedback: (messageId: string, feedback: 1 | -1) => request<{ messageId: string; feedback: number }>(`/chat/messages/${messageId}/feedback`, { method: "PATCH", body: JSON.stringify({ feedback }) }),
  applyCoupon: (code: string) => request<Cart>("/cart/coupon", { method: "POST", body: JSON.stringify({ code }) }),
  removeCoupon: () => request<Cart>("/cart/coupon", { method: "DELETE" }),
  customer: () => request<{ id: string; email: string; name: string; avatarUrl: string | null }>("/auth/me"),
  customerLogout: () => request<void>("/auth/logout", { method: "POST" }),
  trackOrder: (code: string, token: string) => request<any>(`/orders/track/${encodeURIComponent(code)}`, { headers: { "x-order-tracking-token": token } }),
  trackOrderByPhone: (orderCode: string, phone: string) => request<any>("/orders/track-verify", { method: "POST", body: JSON.stringify({ orderCode, phone }) }),
  trackOrderQr: (code: string, token: string) => request<any>(`/orders/track/${encodeURIComponent(code)}/qr`, { headers: { "x-order-tracking-token": token } }),
  confirmTrackedPayment: (code: string, token: string) => request<any>(`/orders/track/${encodeURIComponent(code)}/confirm-payment`, { method: "POST", headers: { "x-order-tracking-token": token } }),
  confirmTrackedPaymentByPhone: (orderCode: string, phone: string) => request<any>("/orders/track-verify/confirm-payment", { method: "POST", body: JSON.stringify({ orderCode, phone }) }),
  checkout: (input: { customerName: string; phone: string; email: string; province: string; ward: string; addressDetail: string; paymentMethod: "COD" | "VIETQR"; note?: string }, idempotencyKey: string) => request<CheckoutResult>("/orders", { method: "POST", headers: { "idempotency-key": idempotencyKey }, body: JSON.stringify(input) }),
  confirmMockPayment: (orderCode: string, trackingToken: string) => request<{ code: string; paidVnd: number; paymentStatus: string; orderStatus: string; alreadyProcessed: boolean }>(`/orders/track/${encodeURIComponent(orderCode)}/confirm-payment`, { method: "POST", headers: { "x-order-tracking-token": trackingToken } }),
};
