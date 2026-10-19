import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Package, ChevronRight, Clock, AlertCircle } from 'lucide-react';
import { Breadcrumb } from '../components/common/Breadcrumb';
import { EmptyState } from '../components/common/EmptyState';
import { SEOHelmet } from '../components/common/SEOHelmet';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { api } from '../api/client';
import { formatCurrency, formatDate } from '../lib/utils';
import { OrderDto, OrderStatus } from '@techstore/shared';

export const Orders: React.FC = () => {
  const [orders, setOrders] = useState<OrderDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api
      .get('/orders/my-orders')
      .then((res) => setOrders(res.data.data))
      .catch((err) => console.error('Failed to load orders', err))
      .finally(() => setIsLoading(false));
  }, []);

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.DELIVERED:
        return <Badge variant="success">Đã giao hàng</Badge>;
      case OrderStatus.SHIPPING:
        return <Badge variant="info">Đang giao hàng</Badge>;
      case OrderStatus.PROCESSING:
        return <Badge variant="primary">Đang đóng gói</Badge>;
      case OrderStatus.CONFIRMED:
        return <Badge variant="primary">Đã xác nhận</Badge>;
      case OrderStatus.CANCELLED:
        return <Badge variant="danger">Đã hủy</Badge>;
      default:
        return <Badge variant="warning">Chờ xử lý</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="py-12 space-y-4 animate-pulse text-left">
        <div className="h-6 w-1/4 bg-slate-200 dark:bg-slate-800 rounded-lg" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left">
      <SEOHelmet title="Đơn Mua Của Tôi | TechStore" />
      <Breadcrumb items={[{ label: 'Đơn mua của tôi' }]} />

      <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100">
          Lịch Sử Đơn Hàng ({orders.length})
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Quản lý và theo dõi tiến độ vận chuyển các đơn hàng của bạn
        </p>
      </div>

      {orders.length === 0 ? (
        <EmptyState
          icon={<Package className="w-8 h-8 text-indigo-500" />}
          title="Bạn chưa có đơn hàng nào"
          description="Khám phá các thiết bị công nghệ hấp dẫn và đặt hàng ngay hôm nay!"
          actionText="Bắt đầu mua sắm"
          actionTo="/products"
        />
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="p-5 rounded-2xl glass-panel border border-slate-200/80 dark:border-slate-800/80 hover:border-indigo-500/40 transition-all space-y-4 shadow-sm"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center">
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100">
                      Đơn hàng #{order.orderCode}
                    </h3>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                      <Clock className="w-3 h-3" />
                      <span>{formatDate(order.createdAt)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {getStatusBadge(order.status)}
                  <span className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400">
                    {formatCurrency(order.totalAmount)}
                  </span>
                </div>
              </div>

              {/* Items Preview */}
              <div className="space-y-2">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-xs py-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <img
                        src={item.productImage || 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=80'}
                        alt={item.productName}
                        className="w-8 h-8 object-cover rounded-lg border shrink-0 bg-white"
                      />
                      <span className="truncate max-w-xs font-medium text-slate-800 dark:text-slate-200">
                        {item.productName} (x{item.quantity})
                      </span>
                    </div>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {formatCurrency(item.total)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="pt-2 flex justify-end">
                <Link to={`/orders/${order.id}`}>
                  <Button variant="outline" size="sm" rightIcon={<ChevronRight className="w-4 h-4" />}>
                    Chi tiết & Theo dõi
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
