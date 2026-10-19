import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  ShoppingBag,
  Users,
  AlertTriangle,
  TrendingUp,
  Package,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { SEOHelmet } from '../../components/common/SEOHelmet';
import { api } from '../../api/client';
import { formatCurrency, formatDate } from '../../lib/utils';
import { AdminDashboardStats } from '@techstore/shared';

const STATUS_COLORS: Record<string, string> = {
  DELIVERED: '#10b981',
  SHIPPING: '#06b6d4',
  CONFIRMED: '#6366f1',
  PROCESSING: '#8b5cf6',
  PENDING: '#f59e0b',
  CANCELLED: '#f43f5e',
};

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api
      .get('/admin/stats')
      .then((res) => setStats(res.data.data))
      .catch((err) => console.error('Failed to fetch admin stats', err))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading || !stats) {
    return (
      <div className="space-y-6 animate-pulse text-left">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          ))}
        </div>
        <div className="h-80 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8 text-left">
      <SEOHelmet title="Bảng Điều Khiển Quản Trị | TechStore Admin" />

      {/* Top Welcome & KPI Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>Tổng quan Hoạt động Kinh doanh</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Dữ liệu thống kê trực tiếp theo thời gian thực từ cơ sở dữ liệu
          </p>
        </div>
      </div>

      {/* 4 Main KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Total Revenue */}
        <div className="p-5 rounded-2xl glass-panel border border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 to-transparent space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tổng Doanh Thu</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100">
              {formatCurrency(stats.totalRevenue)}
            </div>
            <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-semibold mt-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+{stats.revenueGrowthPercent}% so với tháng trước</span>
            </div>
          </div>
        </div>

        {/* Total Orders */}
        <div className="p-5 rounded-2xl glass-panel border border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-transparent space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tổng Đơn Hàng</span>
            <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100">
              {stats.totalOrders}
            </div>
            <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-semibold mt-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+{stats.orderGrowthPercent}% tỷ lệ hoàn thành</span>
            </div>
          </div>
        </div>

        {/* Total Customers */}
        <div className="p-5 rounded-2xl glass-panel border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 to-transparent space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Khách Hàng</span>
            <div className="w-8 h-8 rounded-xl bg-cyan-600 text-white flex items-center justify-center shadow-md">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100">
              {stats.totalCustomers}
            </div>
            <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-semibold mt-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+{stats.customerGrowthPercent}% người dùng mới</span>
            </div>
          </div>
        </div>

        {/* Low Stock Warning */}
        <div className="p-5 rounded-2xl glass-panel border border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-transparent space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cảnh Báo Kho Hàng</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100">
              {stats.lowStockProductsCount} SP
            </div>
            <p className="text-[11px] text-amber-600 font-semibold mt-1">
              Sản phẩm có tồn kho ≤ 10
            </p>
          </div>
        </div>
      </div>

      {/* Analytics Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Revenue Trends Chart (Area Chart) */}
        <div className="lg:col-span-8 p-6 rounded-3xl glass-panel border border-slate-200/80 dark:border-slate-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Biểu Đồ Doanh Thu 7 Ngày Gần Nhất
            </h3>
            <span className="text-xs text-indigo-600 font-semibold">Đơn vị: VNĐ</span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.revenueTrends}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickFormatter={(val) => `${(val / 1000000).toFixed(0)}Tr`}
                />
                <Tooltip
                  formatter={(val: any) => [formatCurrency(Number(val)), 'Doanh thu']}
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    borderRadius: '12px',
                    border: '1px solid rgba(51, 65, 85, 0.8)',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#6366f1"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#revenueGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Orders Breakdown by Status (Donut Chart) */}
        <div className="lg:col-span-4 p-6 rounded-3xl glass-panel border border-slate-200/80 dark:border-slate-800/80 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Cơ Cấu Trạng Thái Đơn Hàng
          </h3>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.ordersByStatus}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                >
                  {stats.ordersByStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status] || '#6366f1'} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any) => [val, 'Số lượng đơn']}
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    borderRadius: '12px',
                    fontSize: '11px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-slate-200 dark:border-slate-800">
            {stats.ordersByStatus.map((item) => (
              <div key={item.status} className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: STATUS_COLORS[item.status] || '#6366f1' }}
                />
                <span className="truncate">{item.status}: {item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Products & Recent Orders Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Top Selling Products */}
        <div className="lg:col-span-6 p-6 rounded-3xl glass-panel border border-slate-200/80 dark:border-slate-800/80 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Top 5 Sản Phẩm Bán Chạy Nhất
          </h3>

          <div className="space-y-3">
            {stats.topSellingProducts.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 text-xs py-1">
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={p.imageUrl}
                    alt={p.name}
                    className="w-10 h-10 object-cover rounded-lg border shrink-0 bg-white"
                  />
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 dark:text-slate-100 truncate">{p.name}</p>
                    <p className="text-[11px] text-slate-400">Đã bán: {p.totalSold} cái</p>
                  </div>
                </div>
                <span className="font-extrabold text-indigo-600 dark:text-indigo-400 shrink-0">
                  {formatCurrency(p.revenue)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="lg:col-span-6 p-6 rounded-3xl glass-panel border border-slate-200/80 dark:border-slate-800/80 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
            <span>Sản Phẩm Cần Nhập Thêm Kho</span>
            <Badge variant="warning">{stats.lowStockProducts.length}</Badge>
          </h3>

          <div className="space-y-3">
            {stats.lowStockProducts.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between gap-3 text-xs py-1">
                <span className="font-semibold truncate">{p.name}</span>
                <span className="px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950 text-rose-600 font-bold shrink-0">
                  Còn {p.stock} cái
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
