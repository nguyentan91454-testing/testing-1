import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search, Package } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { SEOHelmet } from '../../components/common/SEOHelmet';
import { toast } from '../../components/ui/Toast';
import { api } from '../../api/client';
import { formatCurrency, formatDate } from '../../lib/utils';

export const AdminProducts: React.FC = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    price: 0,
    salePrice: '',
    stock: 0,
    sku: '',
    description: '',
    isActive: true,
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/admin/products?limit=50');
      setProducts(res.data.data);
    } catch (err) {
      console.error('Failed to fetch products', err);
    } finally {
      setIsLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingProduct(null);
    setFormData({ name: '', price: 0, salePrice: '', stock: 0, sku: '', description: '', isActive: true });
    setIsModalOpen(true);
  };

  const openEditModal = (product: any) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      price: product.price,
      salePrice: product.salePrice || '',
      stock: product.stock,
      sku: product.sku || '',
      description: product.description || '',
      isActive: product.isActive,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingProduct) {
        await api.patch(`/admin/products/${editingProduct.id}`, {
          ...formData,
          salePrice: formData.salePrice ? Number(formData.salePrice) : null,
        });
        toast.success('Cập nhật sản phẩm thành công!');
      } else {
        await api.post('/admin/products', {
          ...formData,
          salePrice: formData.salePrice ? Number(formData.salePrice) : null,
        });
        toast.success('Thêm sản phẩm mới thành công!');
      }
      setIsModalOpen(false);
      fetchProducts();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Thao tác không thành công');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Bạn có chắc muốn xóa sản phẩm "${name}"?`)) return;
    try {
      await api.delete(`/admin/products/${id}`);
      toast.success('Đã xóa sản phẩm thành công');
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể xóa sản phẩm này');
    }
  };

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.sku && p.sku.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6 text-left">
      <SEOHelmet title="Quản Lý Sản Phẩm | TechStore Admin" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
            Quản Lý Sản Phẩm ({products.length})
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Thêm, sửa, xóa sản phẩm và quản lý tồn kho</p>
        </div>
        <Button variant="primary" size="sm" onClick={openCreateModal} leftIcon={<Plus className="w-4 h-4" />}>
          Thêm sản phẩm mới
        </Button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm kiếm theo tên, SKU..."
          className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
        />
      </div>

      {/* Products Table */}
      <div className="rounded-2xl overflow-hidden glass-panel border border-slate-200/80 dark:border-slate-800/80">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3 font-bold text-slate-600 dark:text-slate-400">Sản phẩm</th>
                <th className="px-4 py-3 font-bold text-slate-600 dark:text-slate-400">SKU</th>
                <th className="px-4 py-3 font-bold text-slate-600 dark:text-slate-400">Giá bán</th>
                <th className="px-4 py-3 font-bold text-slate-600 dark:text-slate-400">Tồn kho</th>
                <th className="px-4 py-3 font-bold text-slate-600 dark:text-slate-400">Trạng thái</th>
                <th className="px-4 py-3 font-bold text-slate-600 dark:text-slate-400">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="px-4 py-3">
                      <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded" />
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    Không tìm thấy sản phẩm nào
                  </td>
                </tr>
              ) : (
                filtered.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={product.images?.[0]?.url || 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=80'}
                          alt={product.name}
                          className="w-10 h-10 object-cover rounded-lg border shrink-0 bg-white"
                        />
                        <div>
                          <p className="font-bold text-slate-900 dark:text-slate-100 line-clamp-1">{product.name}</p>
                          <p className="text-[10px] text-slate-400">{product.brand?.name} · {product.category?.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-500">{product.sku || '—'}</td>
                    <td className="px-4 py-3 font-extrabold text-indigo-600 dark:text-indigo-400">
                      {formatCurrency(product.salePrice || product.price)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-bold ${product.stock <= 5 ? 'text-rose-500' : product.stock <= 15 ? 'text-amber-500' : 'text-emerald-600'}`}>
                        {product.stock}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {product.isActive ? (
                        <Badge variant="success">Đang bán</Badge>
                      ) : (
                        <Badge variant="secondary">Ẩn</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => openEditModal(product)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/60"
                          title="Sửa"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id, product.name)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60"
                          title="Xóa"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Product Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProduct ? `Sửa: ${editingProduct.name}` : 'Thêm Sản Phẩm Mới'}
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>Hủy</Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={isSubmitting}
              onClick={handleSubmit as any}
            >
              {editingProduct ? 'Lưu thay đổi' : 'Tạo sản phẩm'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-3 text-left" id="product-form">
          <Input
            label="Tên sản phẩm"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Giá gốc (₫)"
              type="number"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
              required
            />
            <Input
              label="Giá sale (Tùy chọn)"
              type="number"
              value={formData.salePrice}
              onChange={(e) => setFormData({ ...formData, salePrice: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Tồn kho"
              type="number"
              value={formData.stock}
              onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
              required
            />
            <Input
              label="Mã SKU"
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Mô tả ngắn</label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
            />
          </div>
          <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="rounded text-indigo-600"
            />
            <span>Hiển thị & Bán sản phẩm này</span>
          </label>
        </form>
      </Modal>
    </div>
  );
};
