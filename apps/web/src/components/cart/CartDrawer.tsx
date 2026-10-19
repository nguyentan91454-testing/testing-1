import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight, Truck } from 'lucide-react';
import { useCartStore } from '../../stores/cart.store';
import { formatCurrency } from '../../lib/utils';
import { Button } from '../ui/Button';
import { APP_DEFAULTS } from '@techstore/shared';

export const CartDrawer: React.FC = () => {
  const navigate = useNavigate();
  const { cart, isCartDrawerOpen, closeCartDrawer, fetchCart, updateQuantity, removeItem } =
    useCartStore();

  useEffect(() => {
    if (isCartDrawerOpen) {
      fetchCart();
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isCartDrawerOpen, fetchCart]);

  if (!isCartDrawerOpen) return null;

  const subtotal = cart?.subtotal || 0;
  const items = cart?.items || [];
  const freeShipRemaining = Math.max(0, APP_DEFAULTS.FREE_SHIPPING_THRESHOLD - subtotal);
  const freeShipPercent = Math.min(100, Math.round((subtotal / APP_DEFAULTS.FREE_SHIPPING_THRESHOLD) * 100));

  const handleCheckout = () => {
    closeCartDrawer();
    navigate('/checkout');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity animate-fade-in"
        onClick={closeCartDrawer}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md glass-dropdown shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col justify-between animate-slide-up bg-white/95 dark:bg-slate-900/95">
          {/* Header */}
          <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Giỏ hàng của bạn ({cart?.itemCount || 0})
              </h2>
            </div>
            <button
              onClick={closeCartDrawer}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Free Shipping Progress Bar */}
          <div className="px-4 sm:px-6 py-3 bg-indigo-50/60 dark:bg-indigo-950/40 border-b border-indigo-100 dark:border-indigo-900/40 text-left">
            <div className="flex items-center gap-1.5 text-xs text-indigo-900 dark:text-indigo-200 font-semibold mb-1.5">
              <Truck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              {freeShipRemaining === 0 ? (
                <span className="text-emerald-600 dark:text-emerald-400">
                  🎉 Bạn được <strong>MIỄN PHÍ VẬN CHUYỂN</strong> toàn quốc!
                </span>
              ) : (
                <span>
                  Mua thêm <strong>{formatCurrency(freeShipRemaining)}</strong> để được Free Ship
                </span>
              )}
            </div>
            <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-500"
                style={{ width: `${freeShipPercent}%` }}
              />
            </div>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-left">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-500">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Giỏ hàng của bạn đang trống
                </p>
                <p className="text-xs text-slate-400 max-w-xs">
                  Hãy khám phá các sản phẩm công nghệ hot nhất để thêm vào giỏ nhé!
                </p>
                <Button size="sm" variant="primary" onClick={closeCartDrawer}>
                  Tiếp tục mua sắm
                </Button>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/30"
                >
                  <img
                    src={
                      item.product.images[0]?.url ||
                      'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=100'
                    }
                    alt={item.product.name}
                    className="w-16 h-16 object-cover rounded-xl border border-slate-200 dark:border-slate-700 shrink-0 bg-white"
                  />

                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/products/${item.product.slug}`}
                      onClick={closeCartDrawer}
                      className="text-xs font-bold text-slate-900 dark:text-slate-100 hover:text-indigo-600 line-clamp-1"
                    >
                      {item.product.name}
                    </Link>

                    {item.variant && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Phiên bản: {item.variant.name}
                      </p>
                    )}

                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400">
                        {formatCurrency(item.unitPrice)}
                      </span>

                      {/* Quantity Modifier */}
                      <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5">
                        <button
                          onClick={() => {
                            if (item.quantity > 1) updateQuantity(item.id, item.quantity - 1);
                            else removeItem(item.id);
                          }}
                          className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-bold px-1.5 min-w-[20px] text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-slate-400 hover:text-rose-500 p-1 transition-colors"
                        title="Xóa"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Subtotal & Checkout CTA */}
          {items.length > 0 && (
            <div className="p-4 sm:p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/80 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">Tạm tính:</span>
                <span className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                  {formatCurrency(subtotal)}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 text-left">
                Phí vận chuyển và mã giảm giá sẽ được áp dụng tại bước thanh toán.
              </p>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <Link to="/cart" onClick={closeCartDrawer} className="w-full">
                  <Button variant="outline" size="md" className="w-full">
                    Xem giỏ hàng
                  </Button>
                </Link>

                <Button
                  variant="glow"
                  size="md"
                  className="w-full"
                  onClick={handleCheckout}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Thanh toán
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
