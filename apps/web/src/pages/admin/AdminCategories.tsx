import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { SEOHelmet } from '../../components/common/SEOHelmet';
import { toast } from '../../components/ui/Toast';
import { api } from '../../api/client';

export const AdminCategories: React.FC = () => {
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ name: '', slug: '', description: '', imageUrl: '' });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/categories');
      setCategories(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingCat(null);
    setFormData({ name: '', slug: '', description: '', imageUrl: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (cat: any) => {
    setEditingCat(cat);
    setFormData({ name: cat.name, slug: cat.slug, description: cat.description || '', imageUrl: cat.imageUrl || '' });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingCat) {
        await api.patch(`/admin/categories/${editingCat.id}`, formData);
        toast.success('Cập nhật danh mục thành công!');
      } else {
        await api.post('/admin/categories', formData);
        toast.success('Thêm danh mục mới thành công!');
      }
      setIsModalOpen(false);
      fetchCategories();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Thao tác thất bại');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Xóa danh mục "${name}"? Thao tác này không thể hoàn tác.`)) return;
    try {
      await api.delete(`/admin/categories/${id}`);
      toast.success('Đã xóa danh mục');
      setCategories((prev) => prev.filter((c) => c.id !== id));
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể xóa danh mục này');
    }
  };

  return (
    <div className="space-y-6 text-left">
      <SEOHelmet title="Quản Lý Danh Mục | TechStore Admin" />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
            Quản Lý Danh Mục ({categories.length})
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Tổ chức danh mục sản phẩm theo cấu trúc phân cấp</p>
        </div>
        <Button variant="primary" size="sm" onClick={openCreateModal} leftIcon={<Plus className="w-4 h-4" />}>
          Thêm danh mục
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-24 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" />
            ))
          : categories.map((cat) => (
              <div
                key={cat.id}
                className="p-4 rounded-2xl glass-panel border border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between hover:border-indigo-500/40 transition-all shadow-sm"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {cat.imageUrl && (
                    <img src={cat.imageUrl} alt={cat.name} className="w-10 h-10 object-cover rounded-xl bg-white" />
                  )}
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">{cat.name}</p>
                    <p className="text-[11px] text-slate-400 font-mono">{cat.slug}</p>
                    <p className="text-[11px] text-slate-500">{cat._count?.products || 0} sản phẩm</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  <button
                    onClick={() => openEditModal(cat)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/60"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(cat.id, cat.name)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCat ? `Sửa: ${editingCat.name}` : 'Thêm Danh Mục Mới'}
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>Hủy</Button>
            <Button variant="primary" size="sm" isLoading={isSubmitting} onClick={handleSubmit as any}>
              {editingCat ? 'Lưu' : 'Tạo mới'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-3 text-left">
          <Input label="Tên danh mục" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
          <Input label="Slug URL (vd: laptops)" value={formData.slug} onChange={(e) => setFormData({ ...formData, slug: e.target.value })} required />
          <Input label="Ảnh đại diện (URL)" value={formData.imageUrl} onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })} />
        </form>
      </Modal>
    </div>
  );
};
