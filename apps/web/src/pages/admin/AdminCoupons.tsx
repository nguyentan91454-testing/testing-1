import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Tag } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { SEOHelmet } from '../../components/common/SEOHelmet';
import { toast } from '../../components/ui/Toast';
import { api } from '../../api/client';
import { formatCurrency, formatDate } from '../../lib/utils';
import { DiscountType } from '@techstore/shared';

export const AdminCoupons: React.FC = () => {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    discountType: DiscountType.PERCENTAGE,
    discountValue: 10,
    minOrderValue: 0,
    maxUsageCount: 100,
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/admin/coupons');
      setCoupons(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post('/admin/coupons', formData);
      toast.success(`Đã tạo mã giảm giá "${formData.code.toUpperCase()}"!`);
      setIsModalOpen(false);
      fetchCoupons();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể tạo mã giảm giá');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivate = async (id: string, code: string) => {
    if (!window.confirm(`Vô hiệu hóa mã "${code}"?`)) return;
    try {
      await api.patch(`/admin/coupons/${id}`, { isActive: false });
      toast.success('Đã vô hiệu hóa mã giảm giá');
      fetchCoupons();
    } catch (err: any) {
      toast.error('Không thể vô hiệu hóa');
    }
  };

  return (
    <div className="space-y-6 text-left">
      <SEOHelmet title="Quản Lý Mã Giảm Giá | TechStore Admin" />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
            Mã Khuyến Mãi & Coupon ({coupons.length})
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Tạo và quản lý mã giảm giá cho khách hàng</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>
          Tạo mã mới
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" />
            ))
          : coupons.map((coupon) => (
              <div
                key={coupon.id}
                className={`p-5 rounded-2xl border shadow-sm glass-panel transition-all ${
                  coupon.isActive
                    ? 'border-emerald-500/30 bg-gradient-to-br from-emerald-50/40 to-transparent dark:from-emerald-950/40'
                    : 'border-slate-200 dark:border-slate-800 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <h3 className="text-sm font-mono font-extrabold text-indigo-600 dark:text-indigo-400">
                        {coupon.code}
                      </h3>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{coupon.description}</p>
                  </div>
                  {coupon.isActive ? (
                    <Badge variant="success">Active</Badge>
                  ) : (
                    <Badge variant="secondary">Inactive</Badge>
                  )}
                </div>

                <div className="space-y-1 text-[11px] text-slate-600 dark:text-slate-400">
                  <div className="flex justify-between">
                    <span>Giảm giá:</span>
                    <span className="font-bold">
                      {coupon.discountType === DiscountType.PERCENTAGE
                        ? `${coupon.discountValue}%`
                        : formatCurrency(coupon.discountValue)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Đơn tối thiểu:</span>
                    <span>{formatCurrency(coupon.minOrderValue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Đã dùng:</span>
                    <span>{coupon.usageCount || 0}/{coupon.maxUsageCount || '∞'}</span>
                  </div>
                  {coupon.endDate && (
                    <div className="flex justify-between">
                      <span>Hết hạn:</span>
                      <span>{formatDate(coupon.endDate)}</span>
                    </div>
                  )}
                </div>

                {coupon.isActive && (
                  <button
                    onClick={() => handleDeactivate(coupon.id, coupon.code)}
                    className="mt-3 text-[11px] font-semibold text-rose-500 hover:text-rose-600"
                  >
                    Vô hiệu hóa →
                  </button>
                )}
              </div>
            ))}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Tạo Mã Giảm Giá Mới"
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>Hủy</Button>
            <Button variant="primary" size="sm" isLoading={isSubmitting} onClick={handleSubmit as any}>
              Tạo coupon
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-3 text-left">
          <Input
            label="Mã Code (in hoa)"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
            placeholder="VD: SALE50"
            required
          />
          <Input
            label="Mô tả"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Giảm 50% cho đơn đầu tiên"
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Loại giảm giá</label>
              <select
                value={formData.discountType}
                onChange={(e) => setFormData({ ...formData, discountType: e.target.value as DiscountType })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              >
                <option value={DiscountType.PERCENTAGE}>Phần trăm (%)</option>
                <option value={DiscountType.FIXED_AMOUNT}>Số tiền cố định (₫)</option>
                <option value={DiscountType.FREE_SHIPPING}>Miễn phí vận chuyển</option>
              </select>
            </div>
            <Input
              label="Giá trị giảm"
              type="number"
              value={formData.discountValue}
              onChange={(e) => setFormData({ ...formData, discountValue: Number(e.target.value) })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Đơn tối thiểu (₫)"
              type="number"
              value={formData.minOrderValue}
              onChange={(e) => setFormData({ ...formData, minOrderValue: Number(e.target.value) })}
            />
            <Input
              label="Số lượt dùng tối đa"
              type="number"
              value={formData.maxUsageCount}
              onChange={(e) => setFormData({ ...formData, maxUsageCount: Number(e.target.value) })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Ngày bắt đầu"
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            />
            <Input
              label="Ngày kết thúc"
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};
