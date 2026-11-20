import { useEffect, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, ShieldCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { z } from "zod";
import { api, type CustomerAddress } from "../lib/api";
import { checkoutProfileValues, phoneSchema } from "../lib/customer-profile";
import { formatVnd } from "../lib/format";
import type { CheckoutResult } from "../types";
import { usePageMeta } from "../hooks/usePageMeta";
import { useVietnamLocations, withCurrentOption } from "../components/VietnamLocationSelects";

const checkoutSchema = z.object({
  customerName: z.string().trim().min(2, "Nhập họ tên người nhận.").max(120),
  phone: phoneSchema,
  email: z.string().trim().email("Email chưa đúng định dạng.").max(254),
  province: z.string().trim().min(2, "Nhập tỉnh hoặc thành phố.").max(100),
  district: z.string().trim().min(2, "Nhập quận hoặc huyện.").max(100),
  ward: z.string().trim().min(2, "Nhập phường hoặc xã.").max(100),
  addressDetail: z.string().trim().min(5, "Nhập địa chỉ chi tiết.").max(500),
  paymentMethod: z.enum(["COD", "VIETQR"]),
  note: z.string().max(1000).optional(),
  consent: z.boolean().refine((value) => value, "Vui lòng đồng ý với chính sách dữ liệu và quyền riêng tư."),
});
type CheckoutForm = z.infer<typeof checkoutSchema>;

export function CheckoutPage() {
  usePageMeta("Đặt hàng", "Nhập thông tin giao nhận và chọn phương thức thanh toán.");
  const queryClient = useQueryClient();
  const cart = useQuery({ queryKey: ["cart"], queryFn: api.cart });
  const customer = useQuery({ queryKey: ["customer"], queryFn: api.customer, retry: false });
  const addresses = useQuery({ queryKey: ["addresses"], queryFn: api.addresses, enabled: Boolean(customer.data) });
  const { locations, isLoading: locationsLoading, error: locationsError } = useVietnamLocations();
  const [result, setResult] = useState<CheckoutResult | null>(() => {
    try {
      const stored = sessionStorage.getItem("checkout-result");
      return stored ? JSON.parse(stored) as CheckoutResult : null;
    } catch {
      return null;
    }
  });
  const [confirmed, setConfirmed] = useState(false);
  const keyRef = useRef<string>(crypto.randomUUID());
  const submittedInSession = useRef(false);
  const prefilledCustomer = useRef<string | null>(null);
  const prefilledAddress = useRef<string | null>(null);
  const editedFields = useRef(new Set<string>());
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [submittedRecipient, setSubmittedRecipient] = useState<{ customerId: string; phone: string; province: string; ward: string; addressDetail: string } | null>(null);
  const form = useForm<CheckoutForm>({ resolver: zodResolver(checkoutSchema), defaultValues: {
    customerName: "", email: "", phone: "", province: "", district: "", ward: "", addressDetail: "", note: "", paymentMethod: "COD", consent: false,
  } });
  useEffect(() => {
    if (!customer.data || prefilledCustomer.current === customer.data.id) return;
    const values = checkoutProfileValues(customer.data);
    for (const field of Object.keys(values) as Array<keyof typeof values>) {
      if (!editedFields.current.has(field) && !form.getFieldState(field).isDirty && !form.getValues(field)) form.setValue(field, values[field]);
    }
    prefilledCustomer.current = customer.data.id;
  }, [customer.data, form]);
  useEffect(() => {
    const address = addresses.data?.find((item) => item.isDefault) ?? addresses.data?.[0];
    if (!address || prefilledAddress.current === address.id || editedFields.current.size > 0) return;
    applyAddress(address);
    prefilledAddress.current = address.id;
  }, [addresses.data]);
  function applyAddress(address: CustomerAddress) {
    setSelectedAddressId(address.id);
    form.setValue("customerName", address.recipientName, { shouldDirty: false });
    form.setValue("phone", address.phone, { shouldDirty: false });
    form.setValue("province", address.province, { shouldDirty: false });
    form.setValue("district", address.district, { shouldDirty: false });
    form.setValue("ward", address.ward, { shouldDirty: false });
    form.setValue("addressDetail", address.addressDetail, { shouldDirty: false });
    for (const field of ["customerName", "phone", "province", "district", "ward", "addressDetail"]) editedFields.current.delete(field);
  }
  const selectedProvince = locations.find((province) => province.name === form.watch("province"));
  const selectedDistrict = selectedProvince?.districts.find((district) => district.name === form.watch("district"));
  const provinceNames = withCurrentOption(locations.map((province) => province.name), form.watch("province"));
  const districtNames = withCurrentOption(selectedProvince?.districts.map((district) => district.name) ?? [], form.watch("district"));
  const wardNames = withCurrentOption(selectedDistrict?.wards.map((ward) => ward.name) ?? [], form.watch("ward"));
  const recipient = form.watch(["phone", "province", "district", "ward", "addressDetail"]);
  const missingPhone = !recipient[0]?.trim();
  const missingAddress = recipient.slice(1).some((value) => !value?.trim());
  const submitOrder = useMutation({
    mutationFn: ({ input }: { input: CheckoutForm; customerId?: string }) => api.checkout(input, keyRef.current),
    onSuccess: (value, { input, customerId }) => {
      submittedInSession.current = true;
      setResult(value);
      sessionStorage.setItem("checkout-result", JSON.stringify(value));
      if (customerId) setSubmittedRecipient({ customerId, phone: input.phone, province: input.province, ward: input.ward, addressDetail: input.addressDetail });
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
  });
  useEffect(() => {
    if (!result || submittedInSession.current || !cart.data?.items.length) return;
    sessionStorage.removeItem("checkout-result");
    setResult(null);
    keyRef.current = crypto.randomUUID();
  }, [cart.data?.items.length, result]);
  const saveRecipient = useMutation({
    mutationFn: () => {
      if (!submittedRecipient || submittedRecipient.customerId !== customer.data?.id) throw new Error("Vui lòng đăng nhập lại để lưu thông tin.");
      const { customerId: _customerId, ...input } = submittedRecipient;
      return api.updateProfile(input);
    },
    onSuccess: (user) => queryClient.setQueryData(["customer"], user),
  });
  const confirmPayment = useMutation({ mutationFn: () => result?.trackingToken ? api.confirmMockPayment(result.code, result.trackingToken) : Promise.reject(new Error("Không tìm thấy thông tin thanh toán.")), onSuccess: () => setConfirmed(true) });

  if (cart.isLoading && !result) return <div className="wrap page-pending">Đang tải thông tin đơn hàng...</div>;
  if (cart.isError && !result) return <div className="wrap error-page"><h1>Chưa thể tải giỏ hàng.</h1><p>{cart.error.message}</p><Link to="/cart" className="button button-dark">Quay lại giỏ hàng</Link></div>;
  if (!cart.data?.items.length && !result) return <div className="wrap error-page"><span className="eyebrow">CHƯA CÓ SẢN PHẨM</span><h1>Giỏ hàng đang trống.</h1><Link to="/products" className="button button-dark">Khám phá sản phẩm <ArrowRight size={16}/></Link></div>;

  if (result) return <div className="wrap checkout-page"><div className="breadcrumbs"><Link to="/">Trang chủ</Link><span>/</span><span>Đặt hàng</span></div><div className="checkout-success"><span className="success-icon"><Check/></span><span className="eyebrow">ĐƠN HÀNG ĐÃ ĐƯỢC GHI NHẬN</span><h1>Cảm ơn bạn, {form.getValues("customerName")}.</h1><p className="success-code">Mã đơn <strong>{result.code}</strong></p><div className="success-summary"><div><span>Tổng đơn</span><strong>{formatVnd(result.totalVnd)}</strong></div><div><span>Đã thanh toán</span><strong>{formatVnd(result.paidVnd)}</strong></div><div><span>Còn thu khi giao</span><strong>{formatVnd(result.codAmountVnd)}</strong></div><div><span>Trạng thái</span><strong>Đang chờ xử lý</strong></div></div>
      {result.payment && <div className="mock-payment"><div><span className="eyebrow">VIETQR MÔ PHỎNG</span><h2>Thanh toán thử nghiệm</h2><p>Không chuyển tiền thật. Mã QR chỉ phục vụ trình diễn.</p><strong>{formatVnd(result.payment.amountVnd)}</strong><span className="qr-caption">Nội dung: {result.payment.qr.payload}</span></div><img src={result.payment.qr.imageUrl} alt="Mã QR thanh toán mô phỏng"/><button className="button button-dark" disabled={confirmPayment.isPending || confirmed} onClick={() => confirmPayment.mutate()}>{confirmed ? "Đã xác nhận thanh toán demo" : confirmPayment.isPending ? "Đang xác nhận..." : "Giả lập đã thanh toán"}<Check size={16}/></button>{confirmPayment.isError && <p className="inline-error">{confirmPayment.error.message}</p>}</div>}
      {submittedRecipient && submittedRecipient.customerId === customer.data?.id && <section className="checkout-save-profile" aria-label="Lưu địa chỉ mặc định"><p>Lưu số điện thoại và địa chỉ người nhận cho lần mua sau? Thông tin chỉ được lưu khi bạn chọn bên dưới.</p><button type="button" className="button button-outline" disabled={saveRecipient.isPending || saveRecipient.isSuccess} onClick={() => saveRecipient.mutate()}>{saveRecipient.isSuccess ? "Đã lưu vào hồ sơ" : saveRecipient.isPending ? "Đang lưu…" : "Lưu SĐT và địa chỉ làm mặc định"}</button>{saveRecipient.isSuccess && <p role="status">Đã cập nhật thông tin giao hàng mặc định.</p>}{saveRecipient.isError && <p className="inline-error" role="alert">{saveRecipient.error.message} Đơn hàng đã được ghi nhận, bạn có thể thử lưu lại.</p>}</section>}
      <Link to={`/orders/track?code=${encodeURIComponent(result.code)}`} className="button button-dark">Theo dõi đơn hàng <ArrowRight size={16}/></Link><Link to="/products" className="button button-outline">Quay lại mua sắm <ArrowRight size={16}/></Link><p className="privacy-note"><ShieldCheck size={15}/> Dùng mã đơn cùng số điện thoại đã đặt hàng để tra cứu an toàn.</p></div></div>;

  return <div className="wrap checkout-page"><div className="breadcrumbs"><Link to="/">Trang chủ</Link><span>/</span><Link to="/cart">Giỏ hàng</Link><span>/</span><span>Đặt hàng</span></div><div className="checkout-heading"><div><span className="eyebrow">THÔNG TIN GIAO NHẬN</span><h1>Hoàn tất đơn hàng.</h1></div><div className="checkout-steps"><span className="done"><Check size={13}/> Giỏ hàng</span><i/><span className="current">Thông tin & thanh toán</span></div></div>
    <div className="checkout-layout"><form className="checkout-form" onChangeCapture={(event) => { const target = event.target; if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) { editedFields.current.add(target.name); if (["customerName", "phone", "province", "district", "ward", "addressDetail"].includes(target.name)) setSelectedAddressId(""); } }} onSubmit={form.handleSubmit((values) => submitOrder.mutate({ input: values, ...(customer.data ? { customerId: customer.data.id } : {}) }))} noValidate>
      {locationsError && <div className="customer-auth-alert checkout-missing-info" role="alert">{locationsError}</div>}{(missingPhone || missingAddress) && <div className="customer-auth-notice checkout-missing-info" role="status"><strong>Vui lòng bổ sung thông tin để hoàn tất đơn hàng:</strong><ul>{missingPhone && <li>Số điện thoại người nhận</li>}{missingAddress && <li>Địa chỉ giao hàng đầy đủ</li>}</ul><span>Bạn có thể dùng số điện thoại và địa chỉ của người nhận khác.</span></div>}
      <section className="form-section"><div className="checkout-recipient-heading"><h2>Người nhận</h2>{customer.data && addresses.data && addresses.data.length > 0 && <div className="saved-address-picker"><label htmlFor="saved-address">Địa chỉ đã lưu</label><select id="saved-address" value={selectedAddressId} onChange={(event) => { const address = addresses.data.find((item) => item.id === event.target.value); if (address) applyAddress(address); else setSelectedAddressId(""); }}><option value="">Nhập thông tin khác</option>{addresses.data.map((address) => <option key={address.id} value={address.id}>{address.label || "Địa chỉ"} · {address.recipientName} · {address.phone}</option>)}</select><Link to="/account/addresses">Quản lý</Link></div>}</div><div className="form-grid"><Field label="Họ và tên" error={form.formState.errors.customerName?.message}><input autoComplete="name" {...form.register("customerName")}/></Field><Field label="Số điện thoại" error={form.formState.errors.phone?.message}><input type="tel" autoComplete="tel" placeholder="09xx xxx xxx" {...form.register("phone")}/></Field><Field label="Email nhận xác nhận" error={form.formState.errors.email?.message}><input type="email" autoComplete="email" {...form.register("email")}/></Field><Field label="Tỉnh / thành phố" error={form.formState.errors.province?.message}><select autoComplete="address-level1" disabled={locationsLoading} {...form.register("province")} onChange={(event) => { form.setValue("province", event.target.value, { shouldDirty: true }); form.setValue("district", "", { shouldDirty: true }); form.setValue("ward", "", { shouldDirty: true }); }}><option value="">{locationsLoading ? "Đang tải tỉnh thành…" : "Chọn tỉnh / thành phố"}</option>{provinceNames.map((name) => <option key={name} value={name}>{name}</option>)}</select></Field><Field label="Quận / huyện" error={form.formState.errors.district?.message}><select autoComplete="address-level2" disabled={!form.watch("province") || locationsLoading} {...form.register("district")} onChange={(event) => { form.setValue("district", event.target.value, { shouldDirty: true }); form.setValue("ward", "", { shouldDirty: true }); }}><option value="">{form.watch("province") ? "Chọn quận / huyện" : "Chọn tỉnh trước"}</option>{districtNames.map((name) => <option key={name} value={name}>{name}</option>)}</select></Field><Field label="Phường / xã" error={form.formState.errors.ward?.message}><select autoComplete="address-level3" disabled={!form.watch("district") || locationsLoading} {...form.register("ward")}><option value="">{form.watch("district") ? "Chọn phường / xã" : "Chọn huyện trước"}</option>{wardNames.map((name) => <option key={name} value={name}>{name}</option>)}</select></Field><Field label="Địa chỉ chi tiết" error={form.formState.errors.addressDetail?.message} className="wide-field"><input autoComplete="street-address" placeholder="Số nhà, tên đường..." {...form.register("addressDetail")}/></Field><Field label="Ghi chú" className="wide-field"><textarea rows={3} placeholder="Hướng dẫn giao hàng (không bắt buộc)" {...form.register("note")}/></Field></div></section>
      <section className="form-section"><h2>Phương thức thanh toán</h2><div className="payment-options"><label className={form.watch("paymentMethod") === "COD" ? "payment-option selected" : "payment-option"}><input type="radio" value="COD" {...form.register("paymentMethod")}/><span className="radio-mark"/><span><strong>Thanh toán khi nhận hàng</strong><small>Thanh toán trực tiếp khi nhận đủ hàng.</small></span><b>COD</b></label>{import.meta.env.DEV && <label className={form.watch("paymentMethod") === "VIETQR" ? "payment-option selected" : "payment-option"}><input type="radio" value="VIETQR" {...form.register("paymentMethod")}/><span className="radio-mark"/><span><strong>VietQR thử nghiệm</strong><small>Chỉ khả dụng trong môi trường phát triển.</small></span><b>QR</b></label>}</div></section>
      <label className="consent-row"><input type="checkbox" {...form.register("consent")}/><span>Tôi đồng ý dùng thông tin này để xử lý đơn hàng và đã đọc <a href="/chinh-sach-quyen-rieng-tu">chính sách quyền riêng tư</a>.</span></label>{form.formState.errors.consent?.message && <p className="inline-error">{form.formState.errors.consent.message}</p>}
      {submitOrder.isError && <p className="form-error">{submitOrder.error.message}</p>}
      <div className="checkout-actions"><Link to="/cart" className="back-link"><ArrowLeft size={15}/> Quay lại giỏ hàng</Link><button className="button button-dark" disabled={submitOrder.isPending || locationsLoading || Boolean(locationsError)}>{submitOrder.isPending ? "Đang tạo đơn..." : "Đặt hàng"}<ArrowRight size={17}/></button></div>
      <p className="privacy-note"><ShieldCheck size={15}/> Đồ án không nhận tiền thật. Dữ liệu đặt hàng chỉ phục vụ trải nghiệm thử.</p>
    </form><aside className="order-summary checkout-summary"><span className="eyebrow">ĐƠN HÀNG CỦA BẠN</span>{cart.data?.items.map((item) => <div className="checkout-line" key={item.id}><span>{item.quantity} × {item.productName}</span><strong>{formatVnd(item.lineTotalVnd)}</strong></div>)}<div><span>Tạm tính</span><strong>{formatVnd(cart.data?.price.subtotalVnd ?? 0)}</strong></div>{(cart.data?.price.discountVnd ?? 0) > 0 && <div><span>Ưu đãi</span><strong className="discount">−{formatVnd(cart.data?.price.discountVnd ?? 0)}</strong></div>}<div><span>Giao hàng</span><span className="summary-muted">Tính theo chính sách giao hàng</span></div><div className="summary-total"><span>Thành tiền</span><strong>{formatVnd(cart.data?.price.totalVnd ?? 0)}</strong></div><small>Máy chủ xác nhận giá và tồn kho lần cuối khi tạo đơn.</small>{!customer.data && <Link className="google-checkout" to={`/login?next=${encodeURIComponent("/checkout")}`}>Đăng nhập hoặc đăng ký <ArrowRight size={14}/></Link>}</aside></div>
  </div>;
}

function Field({ label, error, className, children }: { label: string; error?: string; className?: string; children: React.ReactNode }) {
  return <label className={`form-field ${className ?? ""}`}><span>{label}</span>{children}{error && <small className="field-error">{error}</small>}</label>;
}
