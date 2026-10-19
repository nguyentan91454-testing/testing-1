import React, { useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { CheckCircle2, PackageCheck, ArrowRight, Home, Sparkles } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { SEOHelmet } from '../components/common/SEOHelmet';
import { formatCurrency, formatDate } from '../lib/utils';

export const OrderSuccess: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const order = location.state?.order;

  useEffect(() => {
    // Fire celebratory confetti!
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });
  }, []);

  if (!order) {
    return (
      <div className="py-20 text-center space-y-4">
        <h2 className="text-xl font-bold">Không tìm thấy thông tin đơn hàng</h2>
        <Link to="/orders">
          <Button variant="primary">Xem danh sách đơn hàng</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 text-left space-y-8 animate-slide-up">
      <SEOHelmet title={`Đặt Hàng Thành Công #${order.orderCode} | TechStore`} />

      <div className="text-center space-y-3">
        <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-glow">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100">
          Đặt Hàng Thành Công! 🎉
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
          Cảm ơn bạn đã tin tưởng TechStore. Đơn hàng của bạn đã được tiếp nhận và xử lý qua giao thức kiểm soát tồn kho tự động.
        </p>
      </div>

      {/* Order Info Card */}
      <div className="p-6 rounded-3xl glass-panel border border-slate-200/80 dark:border-slate-800/80 space-y-4 shadow-lg">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400">Mã đơn hàng</span>
            <h3 className="text-base font-extrabold text-indigo-600 dark:text-indigo-400">
              #{order.orderCode}
            </h3>
          </div>

          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400">Trạng thái thanh toán</span>
            <div>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                {order.paymentStatus}
              </span>
            </div>
          </div>
        </div>

        {/* Address and Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <span className="font-semibold text-slate-400 block mb-1">Địa chỉ nhận hàng:</span>
            <p className="font-bold text-slate-800 dark:text-slate-200">
              {order.shippingAddress?.recipientName} - {order.shippingAddress?.phone}
            </p>
            <p className="text-slate-500">
              {order.shippingAddress?.street}, {order.shippingAddress?.ward}, {order.shippingAddress?.district}, {order.shippingAddress?.city}
            </p>
          </div>

          <div>
            <span className="font-semibold text-slate-400 block mb-1">Phương thức thanh toán:</span>
            <p className="font-bold text-slate-800 dark:text-slate-200">
              {order.paymentMethod}
            </p>
            <p className="text-slate-500 mt-1">
              Tổng tiền: <strong className="text-indigo-600 dark:text-indigo-400">{formatCurrency(order.totalAmount)}</strong>
            </p>
          </div>
        </div>

        {/* Items */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
          <span className="font-semibold text-slate-400 text-xs block">Sản phẩm đã đặt:</span>
          {order.items?.map((item: any) => (
            <div key={item.id} className="flex items-center justify-between text-xs py-1">
              <span className="truncate max-w-xs">{item.productName} (x{item.quantity})</span>
              <span className="font-bold">{formatCurrency(item.total)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Next Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link to={`/orders/${order.id}`} className="w-full sm:w-auto">
          <Button variant="primary" size="md" className="w-full" rightIcon={<PackageCheck className="w-4 h-4" />}>
            Theo dõi đơn hàng
          </Button>
        </Link>
        <Link to="/" className="w-full sm:w-auto">
          <Button variant="outline" size="md" className="w-full" leftIcon={<Home className="w-4 h-4" />}>
            Về trang chủ
          </Button>
        </Link>
      </div>
    </div>
  );
};
