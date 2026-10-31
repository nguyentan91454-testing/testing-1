import { useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, ShieldCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { z } from "zod";
import { api } from "../lib/api";
import { formatVnd } from "../lib/format";
import type { CheckoutResult } from "../types";
import { usePageMeta } from "../hooks/usePageMeta";

const checkoutSchema = z.object({
  customerName: z.string().trim().min(2, "Nhập họ tên người nhận.").max(120),
  phone: z.string().trim().min(9, "Nhập số điện thoại hợp lệ.").max(24),
  email: z.string().trim().email("Email chưa đúng định dạng.").max(254),
  province: z.string().trim().min(2, "Nhập tỉnh hoặc thành phố."),
  ward: z.string().trim().min(2, "Nhập phường hoặc xã."),
  addressDetail: z.string().trim().min(5, "Nhập địa chỉ chi tiết."),
  paymentMethod: z.enum(["COD", "VIETQR"]),
  note: z.string().max(1000).optional(),
  consent: z.boolean().refine((value) => value, "Vui lòng đồng ý với chính sách dữ liệu demo."),
});
type CheckoutForm = z.infer<typeof checkoutSchema>;

export function CheckoutPage() {
  usePageMeta("Đặt hàng demo", "Nhập thông tin giao nhận và chọn phương thức thanh toán mô phỏng.");
  const queryClient = useQueryClient();
  const cart = useQuery({ queryKey: ["cart"], queryFn: api.cart });
  const [result, setResult] = useState<CheckoutResult | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const keyRef = useRef<string>(crypto.randomUUID());
  const form = useForm<CheckoutForm>({ resolver: zodResolver(checkoutSchema), defaultValues: { paymentMethod: "COD", consent: false } });
  const submitOrder = useMutation({ mutationFn: ({ input }: { input: CheckoutForm }) => api.checkout(input, keyRef.current), onSuccess: (value) => { setResult(value); queryClient.invalidateQueries({ queryKey: ["cart"] }); } });
  const confirmPayment = useMutation({ mutationFn: () => result ? api.confirmMockPayment(result.code, result.trackingToken) : Promise.reject(new Error("Không tìm thấy thông tin thanh toán.")), onSuccess: () => setConfirmed(true) });

  if (cart.isLoading) return <div className="wrap page-pending">Đang tải thông tin đơn hàng...</div>;
  if (cart.isError) return <div className="wrap error-page"><h1>Chưa thể tải giỏ hàng.</h1><p>{cart.error.message}</p><Link to="/cart" className="button button-dark">Quay lại giỏ hàng</Link></div>;
  if (!cart.data?.items.length && !result) return <div className="wrap error-page"><span className="eyebrow">CHƯA CÓ SẢN PHẨM</span><h1>Giỏ hàng đang trống.</h1><Link to="/products" className="button button-dark">Khám phá sản phẩm <ArrowRight size={16}/></Link></div>;

  if (result) return <div className="wrap checkout-page"><div className="breadcrumbs"><Link to="/">Trang chủ</Link><span>/</span><span>Đặt hàng</span></div><div className="checkout-success"><span className="success-icon"><Check/></span><span className="eyebrow">ĐƠN HÀNG DEMO ĐÃ ĐƯỢC GHI NHẬN</span><h1>Cảm ơn bạn, {form.getValues("customerName")}.</h1><p className="success-code">Mã đơn <strong>{result.code}</strong></p><div className="success-summary"><div><span>Tổng đơn</span><strong>{formatVnd(result.totalVnd)}</strong></div><div><span>Đã thanh toán</span><strong>{formatVnd(result.depositRequiredVnd)}</strong></div><div><span>Còn thu khi giao</span><strong>{formatVnd(result.codAmountVnd)}</strong></div><div><span>Trạng thái</span><strong>Đang chờ xử lý</strong></div></div>
      {result.payment && <div className="mock-payment"><div><span className="eyebrow">VIETQR MÔ PHỎNG</span><h2>Thanh toán thử nghiệm</h2><p>Không chuyển tiền thật. Mã QR chỉ phục vụ trình diễn.</p><strong>{formatVnd(result.payment.amountVnd)}</strong><span className="qr-caption">Nội dung: {result.payment.qr.payload}</span></div><img src={result.payment.qr.imageUrl} alt="Mã QR thanh toán mô phỏng"/><button className="button button-dark" disabled={confirmPayment.isPending || confirmed} onClick={() => confirmPayment.mutate()}>{confirmed ? "Đã xác nhận thanh toán demo" : confirmPayment.isPending ? "Đang xác nhận..." : "Giả lập đã thanh toán"}<Check size={16}/></button>{confirmPayment.isError && <p className="inline-error">{confirmPayment.error.message}</p>}</div>}
      <Link to="/products" className="button button-outline">Quay lại mua sắm <ArrowRight size={16}/></Link><p className="privacy-note"><ShieldCheck size={15}/> Thông tin này chỉ dùng trong môi trường demo. Token theo dõi không được lưu vào URL.</p></div></div>;

  return <div className="wrap checkout-page"><div className="breadcrumbs"><Link to="/">Trang chủ</Link><span>/</span><Link to="/cart">Giỏ hàng</Link><span>/</span><span>Đặt hàng</span></div><div className="checkout-heading"><div><span className="eyebrow">THÔNG TIN GIAO NHẬN</span><h1>Hoàn tất đơn hàng.</h1></div><div className="checkout-steps"><span className="done"><Check size={13}/> Giỏ hàng</span><i/><span className="current">Thông tin & thanh toán</span></div></div>
    <div className="checkout-layout"><form className="checkout-form" onSubmit={form.handleSubmit((values) => submitOrder.mutate({ input: values }))} noValidate>
      <section className="form-section"><h2>Người nhận</h2><div className="form-grid"><Field label="Họ và tên" error={form.formState.errors.customerName?.message}><input autoComplete="name" {...form.register("customerName")}/></Field><Field label="Số điện thoại" error={form.formState.errors.phone?.message}><input type="tel" autoComplete="tel" placeholder="09xx xxx xxx" {...form.register("phone")}/></Field><Field label="Email nhận xác nhận" error={form.formState.errors.email?.message}><input type="email" autoComplete="email" {...form.register("email")}/></Field><Field label="Tỉnh / thành phố" error={form.formState.errors.province?.message}><input autoComplete="address-level1" {...form.register("province")}/></Field><Field label="Phường / xã" error={form.formState.errors.ward?.message}><input autoComplete="address-level2" {...form.register("ward")}/></Field><Field label="Địa chỉ chi tiết" error={form.formState.errors.addressDetail?.message} className="wide-field"><input autoComplete="street-address" placeholder="Số nhà, tên đường..." {...form.register("addressDetail")}/></Field><Field label="Ghi chú" className="wide-field"><textarea rows={3} placeholder="Hướng dẫn giao hàng (không bắt buộc)" {...form.register("note")}/></Field></div></section>
      <section className="form-section"><h2>Phương thức thanh toán</h2><div className="payment-options"><label className={form.watch("paymentMethod") === "COD" ? "payment-option selected" : "payment-option"}><input type="radio" value="COD" {...form.register("paymentMethod")}/><span className="radio-mark"/><span><strong>Thanh toán khi nhận hàng</strong><small>Đơn demo sẽ mô phỏng số tiền cần thu.</small></span><b>COD</b></label><label className={form.watch("paymentMethod") === "VIETQR" ? "payment-option selected" : "payment-option"}><input type="radio" value="VIETQR" {...form.register("paymentMethod")}/><span className="radio-mark"/><span><strong>VietQR mô phỏng</strong><small>Hiển thị QR thử nghiệm, không giao dịch thật.</small></span><b>QR</b></label></div></section>
      <label className="consent-row"><input type="checkbox" {...form.register("consent")}/><span>Tôi đồng ý dùng thông tin này trong phạm vi đồ án demo và đã đọc <a href="/chinh-sach-quyen-rieng-tu">chính sách quyền riêng tư</a>.</span></label>{form.formState.errors.consent?.message && <p className="inline-error">{form.formState.errors.consent.message}</p>}
      {submitOrder.isError && <p className="form-error">{submitOrder.error.message}</p>}
      <div className="checkout-actions"><Link to="/cart" className="back-link"><ArrowLeft size={15}/> Quay lại giỏ hàng</Link><button className="button button-dark" disabled={submitOrder.isPending}>{submitOrder.isPending ? "Đang tạo đơn..." : "Đặt hàng demo"}<ArrowRight size={17}/></button></div>
      <p className="privacy-note"><ShieldCheck size={15}/> Đồ án không nhận tiền thật. Dữ liệu đặt hàng chỉ phục vụ trải nghiệm thử.</p>
    </form><aside className="order-summary checkout-summary"><span className="eyebrow">ĐƠN HÀNG CỦA BẠN</span>{cart.data?.items.map((item) => <div className="checkout-line" key={item.id}><span>{item.quantity} × {item.productName}</span><strong>{formatVnd(item.lineTotalVnd)}</strong></div>)}<div><span>Tạm tính</span><strong>{formatVnd(cart.data?.price.subtotalVnd ?? 0)}</strong></div>{(cart.data?.price.discountVnd ?? 0) > 0 && <div><span>Ưu đãi</span><strong className="discount">−{formatVnd(cart.data?.price.discountVnd ?? 0)}</strong></div>}<div><span>Giao hàng</span><span className="summary-muted">Tính theo chính sách demo</span></div><div className="summary-total"><span>Thành tiền</span><strong>{formatVnd(cart.data?.price.totalVnd ?? 0)}</strong></div><small>Máy chủ xác nhận giá và tồn kho lần cuối khi tạo đơn.</small><a className="google-checkout" href="/api/v1/auth/google">Đăng nhập Google <ArrowRight size={14}/></a></aside></div>
  </div>;
}

function Field({ label, error, className, children }: { label: string; error?: string; className?: string; children: React.ReactNode }) {
  return <label className={`form-field ${className ?? ""}`}><span>{label}</span>{children}{error && <small className="field-error">{error}</small>}</label>;
}
