import React, { useEffect } from 'react';
import { Heart, ShoppingBag, Trash2 } from 'lucide-react';
import { Breadcrumb } from '../components/common/Breadcrumb';
import { EmptyState } from '../components/common/EmptyState';
import { SEOHelmet } from '../components/common/SEOHelmet';
import { ProductCard } from '../components/product/ProductCard';
import { useWishlistStore } from '../stores/wishlist.store';

export const Wishlist: React.FC = () => {
  const { items, fetchWishlist, isLoading } = useWishlistStore();

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  return (
    <div className="space-y-6 text-left">
      <SEOHelmet title="Danh Sách Yêu Thích | TechStore" />
      <Breadcrumb items={[{ label: 'Danh sách yêu thích' }]} />

      <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Heart className="w-6 h-6 text-pink-500 fill-pink-500" />
          <span>Sản Phẩm Yêu Thích ({items.length})</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Danh sách các sản phẩm bạn đã lưu để xem lại hoặc mua sau
        </p>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={<Heart className="w-8 h-8 text-pink-500" />}
          title="Chưa có sản phẩm yêu thích"
          description="Hãy nhấn vào biểu tượng trái tim ở các sản phẩm bạn yêu thích để lưu vào danh sách này."
          actionText="Khám phá sản phẩm ngay"
          actionTo="/products"
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {items.map((item) => (
            <ProductCard key={item.id} product={item.product} />
          ))}
        </div>
      )}
    </div>
  );
};
