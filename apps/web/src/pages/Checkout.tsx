import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ShieldCheck,
  CreditCard,
  QrCode,
  Truck,
  ArrowRight,
  CheckCircle2,
  Lock,
  Tag,
  ShoppingBag,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Breadcrumb } from '../components/common/Breadcrumb';
import { SEOHelmet } from '../components/common/SEOHelmet';
import { toast } from '../components/ui/Toast';
import { useCartStore } from '../stores/cart.store';
import { useAuthStore } from '../stores/auth.store';
import { api } from '../api/client';
import { formatCurrency } from '../lib/utils';
import { AddressSchema, PaymentMethod, APP_DEFAULTS } from '@techstore/shared';
import { z } from 'zod';

const CheckoutFormSchema = AddressSchema.extend({
  paymentMethod: z.nativeEnum(PaymentMethod).default(PaymentMethod.MOCK_CARD),
  customerNote: z.string().max(500).optional(),
});

type CheckoutFormData = z.infer<typeof CheckoutFormSchema>;

export const Checkout: React.FC = () => {
  const navigate = useNavigate();
  const { cart, fetchCart, clearCart } = useCartStore();
  const { user, isAuthenticated } = useAuthStore();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);

  // Load saved coupon from cart page if any
  useEffect(() => {
    const saved = localStorage.getItem('checkoutCoupon');
    if (saved) {
      try {
        setAppliedCoupon(JSON.parse(saved));
      } catch {}
    }
  }, []);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CheckoutFormData>({
    resolver: zodResolver(CheckoutFormSchema),
    defaultValues: {
      recipientName: user?.fullName || '',
      phone: user?.phone || '',
      street: '123 Đường Nguyễn Huệ',
      ward: 'Bến Nghé',
      district: 'Quận 1',
      city: 'TP. Hồ Chí Minh',
      paymentMethod: PaymentMethod.MOCK_CARD,
      customerNote: '',
    },
  });

  const selectedPaymentMethod = watch('paymentMethod');

  // Pre-fill user address if available
  useEffect(() => {
    if (user) {
      setValue('recipientName', user.fullName);
      if (user.phone) setValue('phone', user.phone);
      if ((user as any).addresses && (user as any).addresses.length > 0) {
        const defaultAddr = (user as any).addresses[0];
        setValue('street', defaultAddr.street);
        setValue('ward', defaultAddr.ward);
        setValue('district', defaultAddr.district);
        setValue('city', defaultAddr.city);
      }
    }
  }, [user, setValue]);

  const items = cart?.items || [];
  const subtotal = cart?.subtotal || 0;
  const discountAmount = appliedCoupon?.discountAmount || 0;
  const shippingFee = subtotal >= APP_DEFAULTS.FREE_SHIPPING_THRESHOLD || subtotal === 0 ? 0 : APP_DEFAULTS.STANDARD_SHIPPING_FEE;
  const total = Math.max(0, subtotal - discountAmount + shippingFee);

  const onSubmit = async (data: CheckoutFormData) => {
    if (!isAuthenticated) {
      toast.error('Vui lòng đăng nhập để tiến hành đặt hàng');
      navigate('/login?redirect=/checkout');
      return;
    }

    if (items.length === 0) {
      toast.error('Giỏ hàng trống, không thể đặt hàng');
      navigate('/products');
      return;
    }

    setIsSubmitting(true);
    try {
      const orderPayload = {
        shippingAddress: {
          recipientName: data.recipientName,
          phone: data.phone,
          street: data.street,
          ward: data.ward,
          district: data.district,
          city: data.city,
        },
        paymentMethod: data.paymentMethod,
        couponCode: appliedCoupon?.code || null,
        customerNote: data.customerNote || null,
        items: items.map((item) => ({
          productId: item.productId,
          variantId: item.variantId || null,
          quantity: item.quantity,
        })),
      };

      const response = await api.post('/orders', orderPayload);
      const createdOrder = response.data.data;

      localStorage.removeItem('checkoutCoupon');
      await clearCart();

      // Navigate to success page
      navigate('/order-success', { state: { order: createdOrder } });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra khi tạo đơn hàng. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const paymentOptions = [
    {
      id: PaymentMethod.MOCK_CARD,
      title: 'Thẻ Quốc Tế / Thẻ ATM (Test Simulator)',
      description: 'Giả lập thanh toán tức thì chuẩn PCI DSS với thẻ Visa/Mastercard',
      icon: <CreditCard className="w-5 h-5 text-indigo-500" />,
      badge: 'Khuyên Dùng',
    },
    {
      id: PaymentMethod.VNPAY,
      title: 'Cổng thanh toán VNPay QR',
      description: 'Quét mã QR qua ứng dụng ngân hàng hoặc ví VNPAY',
      icon: <QrCode className="w-5 h-5 text-blue-500" />,
    },
    {
      id: PaymentMethod.MOMO,
      title: 'Ví Điện Tử MoMo',
      description: 'Thanh toán siêu tốc 1 chạm qua ứng dụng MoMo',
      icon: <QrCode className="w-5 h-5 text-pink-500" />,
    },
    {
      id: PaymentMethod.COD,
      title: 'Thanh toán khi nhận hàng (COD)',
      description: 'Kiểm tra hàng trước và thanh toán tiền mặt cho shipper',
      icon: <Truck className="w-5 h-5 text-emerald-500" />,
    },
  ];

  return (
    <div className="space-y-6 text-left">
      <SEOHelmet title="Thanh Toán Đơn Hàng | TechStore" />
      <Breadcrumb items={[{ label: 'Giỏ hàng', to: '/cart' }, { label: 'Thanh toán' }]} />

      <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Lock className="w-5 h-5 text-emerald-500" />
          <span>Thanh Toán An Toàn & Bảo Mật</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Giao dịch được mã hóa và xử lý bởi giao thức ACID Transactions bảo đảm tồn kho nguyên tử.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Form: Address & Payment */}
          <div className="lg:col-span-7 space-y-6">
            {/* Step 1: Shipping Address */}
            <div className="p-6 rounded-2xl glass-panel border border-slate-200/80 dark:border-slate-800/80 space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs">
                  1
                </span>
                <span>Thông tin người nhận & Địa chỉ giao hàng</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Họ tên người nhận"
                  placeholder="Nguyễn Văn A"
                  error={errors.recipientName?.message}
                  {...register('recipientName')}
                />
                <Input
                  label="Số điện thoại liên hệ"
                  placeholder="0981234567"
                  error={errors.phone?.message}
                  {...register('phone')}
                />
              </div>

              <Input
                label="Địa chỉ số nhà, tên đường/phố"
                placeholder="123 Đường Nguyễn Huệ"
                error={errors.street?.message}
                {...register('street')}
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input
                  label="Phường / Xã"
                  placeholder="Bến Nghé"
                  error={errors.ward?.message}
                  {...register('ward')}
                />
                <Input
                  label="Quận / Huyện"
                  placeholder="Quận 1"
                  error={errors.district?.message}
                  {...register('district')}
                />
                <Input
                  label="Tỉnh / Thành phố"
                  placeholder="TP. Hồ Chí Minh"
                  error={errors.city?.message}
                  {...register('city')}
                />
              </div>
            </div>

            {/* Step 2: Payment Method */}
            <div className="p-6 rounded-2xl glass-panel border border-slate-200/80 dark:border-slate-800/80 space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs">
                  2
                </span>
                <span>Chọn phương thức thanh toán</span>
              </div>

              <div className="space-y-2.5">
                {paymentOptions.map((opt) => {
                  const isSelected = selectedPaymentMethod === opt.id;
                  return (
                    <label
                      key={opt.id}
                      onClick={() => setValue('paymentMethod', opt.id)}
                      className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 ring-2 ring-indigo-500/20 shadow-sm'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                      }`}
                    >
                      <input
                        type="radio"
                        value={opt.id}
                        {...register('paymentMethod')}
                        className="mt-1 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0">
                        {opt.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                            {opt.title}
                          </span>
                          {opt.badge && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold">
                              {opt.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {opt.description}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Step 3: Customer Note */}
            <div className="p-6 rounded-2xl glass-panel border border-slate-200/80 dark:border-slate-800/80 space-y-3">
              <label className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                Ghi chú cho đơn hàng (Tùy chọn)
              </label>
              <textarea
                rows={2}
                placeholder="Giao giờ hành chính, gọi trước khi giao 15 phút..."
                {...register('customerNote')}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Right Column: Order Review */}
          <div className="lg:col-span-5 space-y-4 sticky top-24">
            <div className="p-6 rounded-2xl glass-panel border border-slate-200/80 dark:border-slate-800/80 space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 pb-2 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span>Đơn hàng của bạn ({items.length} món)</span>
                <Link to="/cart" className="text-xs font-normal text-indigo-600 hover:underline">
                  Chỉnh sửa
                </Link>
              </h3>

              {/* Items preview list */}
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <img
                      src={item.product.images[0]?.url || 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=100'}
                      alt={item.product.name}
                      className="w-12 h-12 object-cover rounded-lg border border-slate-200 dark:border-slate-700 shrink-0 bg-white"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                        {item.product.name}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {formatCurrency(item.unitPrice)} x {item.quantity}
                      </p>
                    </div>
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {formatCurrency(item.totalPrice)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Breakdown */}
              <div className="space-y-2 text-xs pt-3 border-t border-slate-200 dark:border-slate-800">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Tạm tính:</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(subtotal)}</span>
                </div>

                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Giảm giá ({appliedCoupon?.code}):</span>
                    <span>-{formatCurrency(discountAmount)}</span>
                  </div>
                )}

                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Phí vận chuyển:</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {shippingFee === 0 ? '0 ₫ (Free Ship)' : formatCurrency(shippingFee)}
                  </span>
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-between text-base font-extrabold">
                  <span className="text-slate-900 dark:text-slate-100">Tổng thanh toán:</span>
                  <span className="text-indigo-600 dark:text-indigo-400">{formatCurrency(total)}</span>
                </div>
              </div>

              <Button
                type="submit"
                variant="glow"
                size="lg"
                isLoading={isSubmitting}
                className="w-full font-extrabold text-sm"
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Đặt Hàng & Thanh Toán
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
