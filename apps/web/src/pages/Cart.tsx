import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Trash2, Plus, Minus, ArrowRight, Tag, Truck, Check } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Breadcrumb } from '../components/common/Breadcrumb';
import { EmptyState } from '../components/common/EmptyState';
import { SEOHelmet } from '../components/common/SEOHelmet';
import { toast } from '../components/ui/Toast';
import { useCartStore } from '../stores/cart.store';
import { api } from '../api/client';
import { formatCurrency } from '../lib/utils';
import { APP_DEFAULTS } from '@techstore/shared';

export const Cart: React.FC = () => {
  const navigate = useNavigate();
  const { cart, fetchCart, updateQuantity, removeItem, clearCart, isLoading } = useCartStore();

  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const items = cart?.items || [];
  const subtotal = cart?.subtotal || 0;
  const shippingFee = subtotal >= APP_DEFAULTS.FREE_SHIPPING_THRESHOLD || subtotal === 0 ? 0 : APP_DEFAULTS.STANDARD_SHIPPING_FEE;
  const total = Math.max(0, subtotal - discountAmount + shippingFee);

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;

    setIsValidatingCoupon(true);
    try {
      const res = await api.post('/coupons/validate', { code: couponCode.trim() });
      setAppliedCoupon(res.data.data.coupon);
      setDiscountAmount(res.data.data.discountAmount);
      toast.success(`Áp dụng mã "${couponCode.toUpperCase()}" thành công!`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Mã giảm giá không hợp lệ');
      setAppliedCoupon(null);
      setDiscountAmount(0);
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handleProceedToCheckout = () => {
    if (appliedCoupon) {
      localStorage.setItem('checkoutCoupon', JSON.stringify({ code: appliedCoupon.code, discountAmount }));
    } else {
      localStorage.removeItem('checkoutCoupon');
    }
    navigate('/checkout');
  };

  if (items.length === 0 && !isLoading) {
    return (
      <div className="py-8">
        <SEOHelmet title="Giỏ Hàng | TechStore" />
        <Breadcrumb items={[{ label: 'Giỏ hàng' }]} />
        <EmptyState
          icon={<ShoppingBag className="w-8 h-8 text-indigo-500" />}
          title="Giỏ hàng của bạn đang trống"
          description="Bạn chưa có sản phẩm nào trong giỏ hàng. Hãy khám phá hàng ngàn ưu đãi công nghệ tại TechStore!"
          actionText="Bắt đầu mua sắm ngay"
          actionTo="/products"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left">
      <SEOHelmet title={`Giỏ Hàng (${cart?.itemCount || 0}) | TechStore`} />
      <Breadcrumb items={[{ label: 'Giỏ hàng' }]} />

      <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100">
            Giỏ Hàng Mua Sắm
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Có <strong>{cart?.itemCount || 0}</strong> sản phẩm trong giỏ của bạn
          </p>
        </div>

        <button
          onClick={clearCart}
          className="text-xs font-semibold text-rose-500 hover:text-rose-600 flex items-center gap-1 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Xóa tất cả</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Items List */}
        <div className="lg:col-span-8 space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-2xl glass-panel border border-slate-200/80 dark:border-slate-800/80 gap-4"
            >
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={
                    item.product.images[0]?.url ||
                    'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=120'
                  }
                  alt={item.product.name}
                  className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-xl border border-slate-200 dark:border-slate-700 shrink-0 bg-white"
                />
                <div className="min-w-0">
                  <Link
                    to={`/products/${item.product.slug}`}
                    className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 hover:text-indigo-600 line-clamp-1"
                  >
                    {item.product.name}
                  </Link>
                  {item.variant && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Phiên bản: {item.variant.name}
                    </p>
                  )}
                  <p className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 mt-1">
                    {formatCurrency(item.unitPrice)}
                  </p>
                </div>
              </div>

              {/* Quantity Stepper & Subtotal */}
              <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4">
                <div className="flex items-center border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 p-1">
                  <button
                    onClick={() => {
                      if (item.quantity > 1) updateQuantity(item.id, item.quantity - 1);
                      else removeItem(item.id);
                    }}
                    className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-xs font-bold px-2.5 min-w-[28px] text-center">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="text-right min-w-[100px]">
                  <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                    {formatCurrency(item.totalPrice)}
                  </span>
                </div>

                <button
                  onClick={() => removeItem(item.id)}
                  className="p-2 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Xóa sản phẩm"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary & Coupon Card */}
        <div className="lg:col-span-4 space-y-4 sticky top-24">
          {/* Coupon Input Box */}
          <div className="p-5 rounded-2xl glass-panel border border-slate-200/80 dark:border-slate-800/80 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              <Tag className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Mã khuyến mãi / Coupon</span>
            </div>

            <form onSubmit={handleApplyCoupon} className="flex gap-2">
              <input
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                placeholder="WELCOME10, FREESHIP..."
                className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono uppercase"
              />
              <Button type="submit" size="sm" variant="secondary" isLoading={isValidatingCoupon}>
                Áp dụng
              </Button>
            </form>

            {appliedCoupon && (
              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300 font-semibold animate-slide-up">
                <div className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-500" />
                  <span>Đã giảm {formatCurrency(discountAmount)} ({appliedCoupon.code})</span>
                </div>
                <button
                  onClick={() => {
                    setAppliedCoupon(null);
                    setDiscountAmount(0);
                  }}
                  className="text-[10px] text-slate-400 hover:text-rose-500 underline"
                >
                  Gỡ bỏ
                </button>
              </div>
            )}
          </div>

          {/* Pricing Breakdown Summary */}
          <div className="p-5 rounded-2xl glass-panel border border-slate-200/80 dark:border-slate-800/80 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 pb-2 border-b border-slate-200 dark:border-slate-800">
              Tóm tắt đơn hàng
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Tạm tính hàng:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(subtotal)}</span>
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>Giảm giá voucher:</span>
                  <span>-{formatCurrency(discountAmount)}</span>
                </div>
              )}

              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <span>Phí vận chuyển:</span>
                  {shippingFee === 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold">
                      Free Ship
                    </span>
                  )}
                </span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {shippingFee === 0 ? '0 ₫' : formatCurrency(shippingFee)}
                </span>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-between text-sm sm:text-base font-extrabold">
                <span className="text-slate-900 dark:text-slate-100">Tổng thanh toán:</span>
                <span className="text-indigo-600 dark:text-indigo-400">{formatCurrency(total)}</span>
              </div>
            </div>

            <div className="pt-3">
              <Button
                variant="glow"
                size="lg"
                onClick={handleProceedToCheckout}
                className="w-full font-bold"
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Tiến hành Đặt Hàng
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
