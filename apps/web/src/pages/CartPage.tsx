import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { formatVnd } from "../lib/format";
import type { Cart } from "../types";
import { usePageMeta } from "../hooks/usePageMeta";

function useCartAction(operation: (id: string, quantity?: number) => Promise<Cart>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, quantity }: { id: string; quantity?: number }) => operation(id, quantity),
    onSuccess: (value) => queryClient.setQueryData(["cart"], value),
  });
}

export function CartPage() {
  usePageMeta("Giỏ hàng", "Xem lại các lựa chọn và số lượng sản phẩm trong giỏ hàng.");
  const queryClient = useQueryClient();
  const cart = useQuery({ queryKey: ["cart"], queryFn: api.cart });
  const update = useCartAction((id, quantity) => api.updateCartItem(id, quantity ?? 1));
  const remove = useCartAction((id) => api.removeCartItem(id));
  const clear = useMutation({ mutationFn: api.clearCart, onSuccess: (value) => queryClient.setQueryData(["cart"], value) });

  if (cart.isLoading) return <div className="wrap page-pending">Đang tải giỏ hàng...</div>;
  if (cart.isError || !cart.data) return <div className="wrap error-page"><h1>Chưa thể tải giỏ hàng.</h1><p>{cart.error?.message}</p></div>;
  const value = cart.data;
  return <div className="wrap cart-page">
    <div className="breadcrumbs"><Link to="/">Trang chủ</Link><span>/</span><span>Giỏ hàng</span></div>
    <div className="cart-heading"><div><span className="eyebrow">MÓN ĐỒ BẠN ĐÃ CHỌN</span><h1>Giỏ hàng <span>({value.items.reduce((sum, item) => sum + item.quantity, 0)})</span></h1></div>{value.items.length > 0 && <button className="bare-button clear-cart" disabled={clear.isPending} onClick={() => clear.mutate()}>Xóa tất cả <Trash2 size={15}/></button>}</div>
    {value.items.length === 0 ? <div className="cart-empty"><span className="empty-icon"><ShoppingBag/></span><h2>Giỏ hàng đang chờ món đầu tiên.</h2><p>Khám phá những thiết kế ánh sáng hợp với căn phòng của bạn.</p><Link to="/products" className="button button-dark">Xem bộ sưu tập <ArrowRight size={16}/></Link></div> : <div className="cart-layout">
      <section className="cart-items">{value.items.map((item) => <article className="cart-item" key={item.id}><Link to="/products" className="cart-thumb">{item.image ? <img src={item.image.url} alt={item.image.alt ?? item.productName}/> : <div className="image-missing"><span>Ảnh minh họa</span></div>}</Link><div className="cart-item-copy"><Link to="/products" className="cart-item-name">{item.productName}</Link><span className="cart-sku">SKU {item.sku}</span>{!item.isAvailable && <span className="inline-error">Số lượng hiện không còn đủ trong kho demo</span>}<div className="quantity-control"><button aria-label="Giảm số lượng" disabled={item.quantity <= 1 || update.isPending} onClick={() => update.mutate({ id: item.id, quantity: item.quantity - 1 })}><Minus size={14}/></button><span>{item.quantity}</span><button aria-label="Tăng số lượng" disabled={item.quantity >= Math.min(10, item.availableStock) || update.isPending} onClick={() => update.mutate({ id: item.id, quantity: item.quantity + 1 })}><Plus size={14}/></button></div></div><div className="cart-line-price"><strong>{formatVnd(item.lineTotalVnd)}</strong><button className="bare-button" aria-label={`Xóa ${item.productName}`} onClick={() => remove.mutate({ id: item.id })}><Trash2 size={16}/></button></div></article>)}{(update.isError || remove.isError || clear.isError) && <p className="inline-error">{(update.error ?? remove.error ?? clear.error)?.message}</p>}</section>
      <aside className="order-summary"><span className="eyebrow">TÓM TẮT ĐƠN HÀNG</span><div><span>Tạm tính</span><strong>{formatVnd(value.price.subtotalVnd)}</strong></div>{value.price.discountVnd > 0 && <div><span>Ưu đãi{value.coupon ? ` · ${value.coupon.code}` : ""}</span><strong className="discount">−{formatVnd(value.price.discountVnd)}</strong></div>}<div><span>Giao hàng</span><span className="summary-muted">Tính ở bước tiếp theo</span></div><div className="summary-total"><span>Tổng tạm tính</span><strong>{formatVnd(value.price.totalVnd)}</strong></div><p>Giá và tồn kho sẽ được xác nhận lại khi đặt hàng.</p><Link to="/checkout" className="button button-dark full-button">Tiến hành đặt hàng <ArrowRight size={17}/></Link><Link to="/products" className="continue-shopping">Tiếp tục xem sản phẩm</Link><small className="demo-legal">Đây là đồ án demo, không thu tiền thật.</small></aside>
    </div>}
  </div>;
}
