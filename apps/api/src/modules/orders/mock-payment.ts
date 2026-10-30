export function buildMockVietQr(orderCode: string, amountVnd: number) {
  const payload = `DEMO-VIETQR|${orderCode}|${amountVnd}`;
  const imageUrl = new URL("https://api.qrserver.com/v1/create-qr-code/");
  imageUrl.searchParams.set("size", "280x280");
  imageUrl.searchParams.set("data", payload);
  return { mode: "DEMO" as const, payload, imageUrl: imageUrl.toString() };
}

export function getMockPaymentStatus(totalVnd: number, paidVnd: number, paymentAmountVnd: number): "PAID" | "DEPOSIT_PAID" {
  if (![totalVnd, paidVnd, paymentAmountVnd].every(Number.isSafeInteger) || totalVnd < 0 || paidVnd < 0 || paymentAmountVnd <= 0) {
    throw new RangeError("Payment amounts must be valid non-negative integer VND");
  }
  return paidVnd + paymentAmountVnd >= totalVnd ? "PAID" : "DEPOSIT_PAID";
}
