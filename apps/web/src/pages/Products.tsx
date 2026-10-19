import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FilterSidebar, FilterState } from '../components/product/FilterSidebar';
import { ProductGrid } from '../components/product/ProductGrid';
import { Breadcrumb } from '../components/common/Breadcrumb';
import { EmptyState } from '../components/common/EmptyState';
import { SEOHelmet } from '../components/common/SEOHelmet';
import { Button } from '../components/ui/Button';
import { api } from '../api/client';
import { ProductDto } from '@techstore/shared';
import { SlidersHorizontal, PackageSearch, ChevronLeft, ChevronRight } from 'lucide-react';

export const Products: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [products, setProducts] = useState<ProductDto[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>({ page: 1, limit: 12, total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Parse filters from URL search params
  const categorySlug = searchParams.get('categorySlug') || undefined;
  const brandSlug = searchParams.get('brandSlug') || undefined;
  const search = searchParams.get('search') || undefined;
  const minPrice = searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined;
  const maxPrice = searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined;
  const rating = searchParams.get('rating') ? Number(searchParams.get('rating')) : undefined;
  const inStock = searchParams.get('inStock') === 'true' ? true : undefined;
  const sort = searchParams.get('sort') || 'newest';
  const page = Number(searchParams.get('page')) || 1;

  const filters: FilterState = {
    categorySlug,
    brandSlug,
    minPrice,
    maxPrice,
    rating,
    inStock,
  };

  // Fetch Categories and Brands for filter sidebar
  useEffect(() => {
    Promise.all([api.get('/categories'), api.get('/brands')])
      .then(([catRes, brandRes]) => {
        setCategories(catRes.data.data);
        setBrands(brandRes.data.data);
      })
      .catch(() => {});
  }, []);

  // Fetch Products based on search params
  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);
      try {
        const query = new URLSearchParams(searchParams);
        if (!query.has('limit')) query.set('limit', '12');

        const res = await api.get(`/products?${query.toString()}`);
        setProducts(res.data.data);
        setMeta(res.data.meta);
      } catch (err) {
        console.error('Failed to fetch products', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProducts();
  }, [searchParams]);

  const handleFilterChange = (newFilters: Partial<FilterState>) => {
    const updated = new URLSearchParams(searchParams);

    Object.entries(newFilters).forEach(([key, val]) => {
      if (val === undefined || val === null || val === '') {
        updated.delete(key);
      } else {
        updated.set(key, String(val));
      }
    });

    updated.set('page', '1'); // Reset to page 1 on filter change
    setSearchParams(updated);
  };

  const handleSortChange = (newSort: string) => {
    const updated = new URLSearchParams(searchParams);
    updated.set('sort', newSort);
    updated.set('page', '1');
    setSearchParams(updated);
  };

  const handlePageChange = (newPage: number) => {
    const updated = new URLSearchParams(searchParams);
    updated.set('page', String(newPage));
    setSearchParams(updated);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleResetFilters = () => {
    setSearchParams({});
  };

  return (
    <div className="space-y-6 text-left">
      <SEOHelmet
        title={search ? `Tìm kiếm "${search}" | TechStore` : 'Danh Sách Sản Phẩm | TechStore'}
        description="Khám phá và so sánh các thiết bị công nghệ mới nhất: Laptop, Smartphone, Âm thanh, Gaming Gear tại TechStore."
      />

      <Breadcrumb items={[{ label: 'Tất cả sản phẩm', to: '/products' }]} />

      {/* Title & Sort Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100">
            {search ? (
              <span>Kết quả tìm kiếm: "{search}"</span>
            ) : categorySlug ? (
              <span className="capitalize">{categories.find((c) => c.slug === categorySlug)?.name || 'Danh mục sản phẩm'}</span>
            ) : (
              <span>Tất cả thiết bị công nghệ</span>
            )}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Tìm thấy <strong>{meta.total}</strong> sản phẩm chính hãng
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Mobile Filter Button */}
          <Button
            variant="outline"
            size="sm"
            className="lg:hidden"
            onClick={() => setIsMobileFilterOpen(true)}
            leftIcon={<SlidersHorizontal className="w-4 h-4" />}
          >
            Bộ lọc
          </Button>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 hidden sm:inline">Sắp xếp:</span>
            <select
              value={sort}
              onChange={(e) => handleSortChange(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium cursor-pointer"
            >
              <option value="newest">Mới nhất</option>
              <option value="popular">Bán chạy nhất</option>
              <option value="top_rated">Đánh giá cao nhất</option>
              <option value="price_asc">Giá: Thấp đến Cao</option>
              <option value="price_desc">Giá: Cao đến Thấp</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Grid & Filter Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Desktop Sidebar Filter */}
        <div className="hidden lg:block lg:col-span-3 p-5 rounded-2xl glass-panel border border-slate-200/80 dark:border-slate-800/80 sticky top-24">
          <FilterSidebar
            categories={categories}
            brands={brands}
            filters={filters}
            onFilterChange={handleFilterChange}
            onReset={handleResetFilters}
          />
        </div>

        {/* Products Grid Column */}
        <div className="lg:col-span-9 space-y-8">
          {products.length === 0 && !isLoading ? (
            <EmptyState
              icon={<PackageSearch className="w-8 h-8 text-indigo-500" />}
              title="Không tìm thấy sản phẩm nào"
              description="Hãy thử thay đổi từ khóa tìm kiếm hoặc bỏ chọn một số tiêu chí bộ lọc."
              actionText="Đặt lại tất cả bộ lọc"
              onActionClick={handleResetFilters}
            />
          ) : (
            <ProductGrid products={products} isLoading={isLoading} skeletonCount={12} />
          )}

          {/* Pagination Stepper */}
          {meta.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-6 border-t border-slate-200 dark:border-slate-800">
              <Button
                variant="outline"
                size="sm"
                disabled={!meta.hasPrevPage}
                onClick={() => handlePageChange(meta.page - 1)}
                leftIcon={<ChevronLeft className="w-4 h-4" />}
              >
                Trước
              </Button>

              <div className="flex items-center gap-1 text-xs font-semibold px-2">
                <span>Trang {meta.page} / {meta.totalPages}</span>
              </div>

              <Button
                variant="outline"
                size="sm"
                disabled={!meta.hasNextPage}
                onClick={() => handlePageChange(meta.page + 1)}
                rightIcon={<ChevronRight className="w-4 h-4" />}
              >
                Tiếp theo
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Filter Modal */}
      {isMobileFilterOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex justify-end">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm animate-fade-in"
            onClick={() => setIsMobileFilterOpen(false)}
          />
          <div className="relative w-full max-w-xs h-full bg-white dark:bg-slate-900 p-6 overflow-y-auto z-10 animate-slide-up shadow-2xl">
            <FilterSidebar
              categories={categories}
              brands={brands}
              filters={filters}
              onFilterChange={(newF) => {
                handleFilterChange(newF);
                setIsMobileFilterOpen(false);
              }}
              onReset={() => {
                handleResetFilters();
                setIsMobileFilterOpen(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
