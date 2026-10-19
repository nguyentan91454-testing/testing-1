import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Package,
  Clock,
  CheckCircle2,
  Truck,
  RotateCcw,
  AlertTriangle,
  ArrowLeft,
  XCircle,
  FileText,
} from 'lucide-react';
import { Breadcrumb } from '../components/common/Breadcrumb';
import { SEOHelmet } from '../components/common/SEOHelmet';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { toast } from '../components/ui/Toast';
import { api } from '../api/client';
import { formatCurrency, formatDate } from '../lib/utils';
import { OrderDto, OrderStatus } from '@techstore/shared';

export const OrderDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<OrderDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    api
      .get(`/orders/${id}`)
      .then((res) => setOrder(res.data.data))
      .catch((err) => console.error('Failed to load order', err))
      .finally(() => setIsLoading(false));
  }, [id]);

  const handleCancelOrder = async () => {
    if (!order) return;
    if (!window.confirm('Bạn có chắc chắn muốn hủy đơn hàng này không? Số lượng sản phẩm sẽ được tự động hoàn lại vào kho.')) {
      return;
    }

    setIsCancelling(true);
    try {
      const res = await api.post(`/orders/${order.id}/cancel`);
      setOrder(res.data.data);
      toast.success('Đã hủy đơn hàng thành công');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể hủy đơn hàng');
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-12 space-y-4 animate-pulse text-left">
        <div className="h-6 w-1/3 bg-slate-200 dark:bg-slate-800 rounded-lg" />
        <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="py-20 text-center space-y-4">
        <h2 className="text-xl font-bold">Không tìm thấy đơn hàng</h2>
        <Link to="/orders">
          <Button variant="primary">Quay lại danh sách</Button>
        </Link>
      </div>
    );
  }

  const steps = [
    { key: OrderStatus.PENDING, label: 'Tiếp nhận đơn' },
    { key: OrderStatus.CONFIRMED, label: 'Đã xác nhận' },
    { key: OrderStatus.PROCESSING, label: 'Đang đóng gói' },
    { key: OrderStatus.SHIPPING, label: 'Đang giao hàng' },
    { key: OrderStatus.DELIVERED, label: 'Giao thành công' },
  ];

  const currentStepIndex = steps.findIndex((s) => s.key === order.status);
  const isCancelled = order.status === OrderStatus.CANCELLED;

  return (
    <div className="space-y-8 text-left">
      <SEOHelmet title={`Chi Tiết Đơn Hàng #${order.orderCode} | TechStore`} />
      <Breadcrumb
        items={[
          { label: 'Đơn mua của tôi', to: '/orders' },
          { label: `#${order.orderCode}` },
        ]}
      />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100">
              Đơn hàng #{order.orderCode}
            </h1>
            {isCancelled ? (
              <Badge variant="danger">Đã hủy</Badge>
            ) : (
              <Badge variant="primary">{order.status}</Badge>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Đặt ngày {formatDate(order.createdAt)}
          </p>
        </div>

        {/* Cancel Button if eligible */}
        {(order.status === OrderStatus.PENDING || order.status === OrderStatus.CONFIRMED) && (
          <Button
            variant="danger"
            size="sm"
            isLoading={isCancelling}
            onClick={handleCancelOrder}
            leftIcon={<XCircle className="w-4 h-4" />}
          >
            Hủy đơn hàng này
          </Button>
        )}
      </div>

      {/* Visual Tracking Stepper */}
      {!isCancelled && (
        <div className="p-6 rounded-3xl glass-panel border border-slate-200/80 dark:border-slate-800/80 space-y-4">
          <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
            Tiến độ giao hàng
          </h3>

          <div className="relative flex items-center justify-between">
            {/* Progress line */}
            <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-200 dark:bg-slate-800 -translate-y-1/2 z-0" />
            <div
              className="absolute top-1/2 left-0 h-1 bg-indigo-600 -translate-y-1/2 z-0 transition-all duration-500"
              style={{
                width: `${Math.max(0, (currentStepIndex / (steps.length - 1)) * 100)}%`,
              }}
            />

            {steps.map((step, idx) => {
              const isCompleted = idx <= currentStepIndex;
              const isCurrent = idx === currentStepIndex;

              return (
                <div key={step.key} className="relative z-10 flex flex-col items-center gap-1.5">
                  <div
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      isCompleted
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                    } ${isCurrent ? 'ring-4 ring-indigo-500/20 scale-110' : ''}`}
                  >
                    {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                  </div>
                  <span
                    className={`text-[10px] sm:text-xs font-medium whitespace-nowrap ${
                      isCompleted ? 'text-slate-900 dark:text-slate-100 font-bold' : 'text-slate-400'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Items Table */}
        <div className="lg:col-span-8 space-y-4">
          <div className="p-6 rounded-3xl glass-panel border border-slate-200/80 dark:border-slate-800/80 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 pb-2 border-b border-slate-200 dark:border-slate-800">
              Danh sách sản phẩm ({order.items.length})
            </h3>

            <div className="space-y-4">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-4 py-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={item.productImage}
                      alt={item.productName}
                      className="w-14 h-14 object-cover rounded-xl border border-slate-200 dark:border-slate-700 shrink-0 bg-white"
                    />
                    <div className="min-w-0">
                      <Link
                        to={`/products/${item.productSlug}`}
                        className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 hover:text-indigo-600 line-clamp-1"
                      >
                        {item.productName}
                      </Link>
                      {item.variantName && (
                        <p className="text-[11px] text-slate-500">Phiên bản: {item.variantName}</p>
                      )}
                      <p className="text-xs text-slate-400 mt-0.5">
                        {formatCurrency(item.price)} x {item.quantity}
                      </p>
                    </div>
                  </div>

                  <div className="text-right font-extrabold text-sm text-slate-900 dark:text-slate-100">
                    {formatCurrency(item.total)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Shipping & Payment Cards */}
        <div className="lg:col-span-4 space-y-4">
          {/* Shipping Address */}
          <div className="p-5 rounded-2xl glass-panel border border-slate-200/80 dark:border-slate-800/80 space-y-2 text-xs">
            <h4 className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider text-[11px] pb-1 border-b border-slate-200 dark:border-slate-800">
              Địa chỉ nhận hàng
            </h4>
            <p className="font-bold text-slate-800 dark:text-slate-200">
              {order.shippingAddress?.recipientName} - {order.shippingAddress?.phone}
            </p>
            <p className="text-slate-500">
              {order.shippingAddress?.street}, {order.shippingAddress?.ward}, {order.shippingAddress?.district}, {order.shippingAddress?.city}
            </p>
            {order.customerNote && (
              <p className="text-slate-500 italic mt-1">Ghi chú: "{order.customerNote}"</p>
            )}
          </div>

          {/* Invoice Summary */}
          <div className="p-5 rounded-2xl glass-panel border border-slate-200/80 dark:border-slate-800/80 space-y-2.5 text-xs">
            <h4 className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider text-[11px] pb-1 border-b border-slate-200 dark:border-slate-800">
              Chi tiết hóa đơn
            </h4>

            <div className="flex justify-between text-slate-500">
              <span>Tạm tính:</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(order.subtotal)}</span>
            </div>

            {order.discountAmount > 0 && (
              <div className="flex justify-between text-emerald-600 font-semibold">
                <span>Giảm giá ({order.couponCode}):</span>
                <span>-{formatCurrency(order.discountAmount)}</span>
              </div>
            )}

            <div className="flex justify-between text-slate-500">
              <span>Phí vận chuyển:</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(order.shippingFee)}</span>
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between text-sm font-extrabold">
              <span>Tổng thanh toán:</span>
              <span className="text-indigo-600 dark:text-indigo-400">{formatCurrency(order.totalAmount)}</span>
            </div>

            <div className="pt-2 text-[11px] text-slate-400">
              Phương thức: <strong>{order.paymentMethod}</strong> ({order.paymentStatus})
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
