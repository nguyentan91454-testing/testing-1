import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, Check, Clock3, PackageCheck, Search, ShieldCheck, Truck } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { usePageMeta } from "../hooks/usePageMeta";
import { api } from "../lib/api";
import { formatVnd } from "../lib/format";

const statusLabels: Record<string, string> = { PENDING: "Đang chờ xác nhận", CONFIRMED: "Đã xác nhận", PACKING: "Đang chuẩn bị hàng", SHIPPED: "Đang giao hàng", DELIVERED: "Đã giao thành công", CANCELLED: "Đã hủy", RETURNED: "Đã hoàn hàng", COMPLAINT: "Đang xử lý khiếu nại" };
const stages = ["PENDING", "CONFIRMED", "PACKING", "SHIPPED", "DELIVERED"];
type TrackedOrder = { code: string; orderStatus: string; paymentStatus: string; totalVnd: number; paidVnd: number; codAmountVnd: number; createdAt: string; items?: Array<{ productName: string; variantName?: string | null; quantity: number }>; payment?: { amountVnd: number; qr?: { imageUrl: string; payload: string } } | null };

export function TrackOrderPage() {
  usePageMeta("Tra cứu đơn hàng", "Theo dõi trạng thái đơn hàng và thanh toán.");
  const [params] = useSearchParams();
  const [code, setCode] = useState(params.get("code") ?? "");
  const [phone, setPhone] = useState("");
  const [trackingToken, setTrackingToken] = useState("");
  const [order, setOrder] = useState<TrackedOrder>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [qr, setQr] = useState<TrackedOrder["payment"]>();

  useEffect(() => {
    const token = new URLSearchParams(window.location.hash.replace(/^#/, "")).get("token");
    const orderCode = params.get("code")?.trim().toUpperCase();
    if (!token || !orderCode) return;
    setTrackingToken(token); setCode(orderCode); setLoading(true);
    void api.trackOrder(orderCode, token).then((result) => { const value = result as TrackedOrder; setOrder(value); setQr(value.payment); }).catch((reason) => setError(reason instanceof Error ? reason.message : "Không thể tra cứu đơn hàng.")).finally(() => setLoading(false));
  }, [params]);

  async function lookup(event?: FormEvent) {
    event?.preventDefault(); setLoading(true); setError(""); setOrder(undefined); setQr(undefined); setTrackingToken("");
    try { const result = await api.trackOrderByPhone(code.trim().toUpperCase(), phone.trim()) as TrackedOrder; setOrder(result); setQr(result.payment); } catch (reason) { setError(reason instanceof Error ? reason.message : "Không thể tra cứu đơn hàng."); } finally { setLoading(false); }
  }

  async function confirmPayment() {
    try {
      if (trackingToken) { await api.confirmTrackedPayment(order!.code, trackingToken); const refreshed = await api.trackOrder(order!.code, trackingToken) as TrackedOrder; setOrder(refreshed); setQr(refreshed.payment); }
      else { await api.confirmTrackedPaymentByPhone(order!.code, phone); await lookup(); }
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Không thể xác nhận thanh toán."); }
  }

  return <div className="wrap tracking-page"><div className="breadcrumbs"><Link to="/">Trang chủ</Link><span>/</span><span>Tra cứu đơn hàng</span></div><header className="tracking-heading"><span className="eyebrow"><PackageCheck size={15}/> THEO DÕI ĐƠN HÀNG</span><h1>Đơn hàng của bạn,<br/>đang ở đâu?</h1><p>Nhập mã đơn và số điện thoại đã dùng khi đặt hàng.</p></header><form className="tracking-form" onSubmit={lookup}><label className="form-field"><span>Mã đơn hàng</span><input required minLength={8} maxLength={40} value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="Ví dụ: ORDER-..."/></label><label className="form-field"><span>Số điện thoại đặt hàng</span><input required type="tel" minLength={9} maxLength={24} value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="09xx xxx xxx" autoComplete="tel"/></label><button className="button button-dark" disabled={loading}>{loading ? "Đang tra cứu" : "Tra cứu đơn"}<Search size={16}/></button></form>{error && <p className="tracking-error" role="alert">{error}</p>}{order && <section className="tracking-result"><div className="tracking-result-head"><div><span className="eyebrow">MÃ ĐƠN</span><h2>{order.code}</h2><small>Đặt lúc {new Date(order.createdAt).toLocaleString("vi-VN")}</small></div><span className={`tracking-status tracking-${order.orderStatus.toLowerCase()}`}><i/>{statusLabels[order.orderStatus] ?? order.orderStatus}</span></div><div className="tracking-steps">{stages.map((stage, index) => { const current = stages.indexOf(order.orderStatus); const done = current >= index && order.orderStatus !== "CANCELLED"; return <div key={stage} className={done ? "done" : ""}><span>{done ? <Check size={14}/> : index + 1}</span><small>{statusLabels[stage]}</small></div>; })}</div><div className="tracking-items"><h3>Sản phẩm trong đơn</h3>{(order.items ?? []).map((item, index) => <div key={`${item.productName}-${index}`}><span>{item.productName}<small>{item.variantName ?? ""} · Số lượng {item.quantity}</small></span></div>)}</div><div className="tracking-totals"><div><span>Tổng đơn hàng</span><strong>{formatVnd(order.totalVnd)}</strong></div><div><span>Đã thanh toán</span><strong>{formatVnd(order.paidVnd)}</strong></div><div><span>Còn thu khi giao</span><strong>{formatVnd(order.codAmountVnd)}</strong></div><div><span>Thanh toán</span><strong>{order.paymentStatus}</strong></div></div>{qr?.qr && <div className="tracking-qr"><div><span className="eyebrow">THANH TOÁN QR</span><h3>Khoản thanh toán đang chờ</h3><p>{formatVnd(qr.amountVnd)}</p><small>Chỉ xác nhận sau khi hệ thống thanh toán đã báo thành công.</small></div><img src={qr.qr.imageUrl} alt="Mã QR thanh toán"/><button type="button" className="button button-outline" onClick={() => void confirmPayment()}>Xác nhận đã thanh toán <Check size={15}/></button></div>}<p className="tracking-demo-note"><ShieldCheck size={15}/> Thông tin đơn chỉ hiển thị khi mã đơn khớp với số điện thoại đặt hàng.</p></section>}<div className="tracking-help"><Clock3 size={17}/><span>Nhận thông báo khi đơn hàng thay đổi trạng thái.<small>Bạn có thể tra cứu lại bằng mã đơn và số điện thoại.</small></span><Truck size={17}/></div><Link to="/products" className="tracking-back">Tiếp tục mua sắm <ArrowRight size={15}/></Link></div>;
}
