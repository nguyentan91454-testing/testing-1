import React, { useState, useEffect } from 'react';
import { Search, ChevronRight, CheckCircle2, XCircle } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { SEOHelmet } from '../../components/common/SEOHelmet';
import { toast } from '../../components/ui/Toast';
import { api } from '../../api/client';
import { formatCurrency, formatDate } from '../../lib/utils';
import { OrderStatus } from '@techstore/shared';

const STATUS_OPTIONS = [
  OrderStatus.PENDING,
  OrderStatus.CONFIRMED,
  OrderStatus.PROCESSING,
  OrderStatus.SHIPPING,
  OrderStatus.DELIVERED,
  OrderStatus.CANCELLED,
];

export const AdminOrders: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      params.set('limit', '50');
      const res = await api.get(`/admin/orders?${params}`);
      setOrders(res.data.data);
    } catch (err) {
      console.error('Failed to fetch orders', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusUpdate = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const res = await api.patch(`/admin/orders/${orderId}/status`, { status: newStatus });
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: res.data.data.status } : o)));
      toast.success(`Cập nhật trạng thái thành "${newStatus}" thành công!`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể cập nhật trạng thái đơn');
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      DELIVERED: 'success',
      SHIPPING: 'info',
      PROCESSING: 'primary',
      CONFIRMED: 'primary',
      CANCELLED: 'danger',
      PENDING: 'warning',
    };
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
  };

  const filtered = orders.filter(
    (o) =>
      o.orderCode?.toLowerCase().includes(search.toLowerCase()) ||
      o.user?.fullName?.toLowerCase().includes(search.toLowerCase()) ||
      o.user?.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 text-left">
      <SEOHelmet title="Quản Lý Đơn Hàng | TechStore Admin" />

      <div>
        <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
          Quản Lý Đơn Hàng ({orders.length})
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Duyệt, xử lý và cập nhật trạng thái vận chuyển đơn hàng
        </p>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo mã đơn, tên, email..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer"
        >
          <option value="">Tất cả trạng thái</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Orders Table */}
      <div className="rounded-2xl overflow-hidden glass-panel border border-slate-200/80 dark:border-slate-800/80">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3 font-bold text-slate-600 dark:text-slate-400">Mã đơn</th>
                <th className="px-4 py-3 font-bold text-slate-600 dark:text-slate-400">Khách hàng</th>
                <th className="px-4 py-3 font-bold text-slate-600 dark:text-slate-400">Ngày đặt</th>
                <th className="px-4 py-3 font-bold text-slate-600 dark:text-slate-400">Tổng tiền</th>
                <th className="px-4 py-3 font-bold text-slate-600 dark:text-slate-400">Trạng thái</th>
                <th className="px-4 py-3 font-bold text-slate-600 dark:text-slate-400">Cập nhật nhanh</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="px-4 py-3">
                      <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded" />
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    Không có đơn hàng nào
                  </td>
                </tr>
              ) : (
                filtered.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      #{order.orderCode}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-bold">{order.user?.fullName}</p>
                      <p className="text-slate-400">{order.user?.email}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(order.createdAt)}</td>
                    <td className="px-4 py-3 font-extrabold text-indigo-600 dark:text-indigo-400">
                      {formatCurrency(order.totalAmount)}
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(order.status)}</td>
                    <td className="px-4 py-3">
                      <select
                        value={order.status}
                        onChange={(e) => handleStatusUpdate(order.id, e.target.value as OrderStatus)}
                        className="px-2 py-1 text-[11px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer"
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
