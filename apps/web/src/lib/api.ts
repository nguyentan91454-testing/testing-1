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

export const api = {
  products: (search: URLSearchParams) => request<Product[]>(`/products?${search.toString()}`),
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
  checkout: (input: { customerName: string; phone: string; email: string; province: string; ward: string; addressDetail: string; paymentMethod: "COD" | "VIETQR"; note?: string }, idempotencyKey: string) => request<CheckoutResult>("/orders", { method: "POST", headers: { "idempotency-key": idempotencyKey }, body: JSON.stringify(input) }),
  confirmMockPayment: (orderCode: string, trackingToken: string) => request<{ code: string; paidVnd: number; paymentStatus: string; orderStatus: string; alreadyProcessed: boolean }>(`/orders/track/${encodeURIComponent(orderCode)}/confirm-payment`, { method: "POST", headers: { "x-order-tracking-token": trackingToken } }),
};
