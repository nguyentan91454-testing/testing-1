import React from 'react';
import { RotateCcw, Filter, Star, Check } from 'lucide-react';
import { Button } from '../ui/Button';
import { formatCurrency } from '../../lib/utils';

export interface FilterState {
  categoryId?: string;
  categorySlug?: string;
  brandId?: string;
  brandSlug?: string;
  minPrice?: number;
  maxPrice?: number;
  rating?: number;
  inStock?: boolean;
}

export interface FilterSidebarProps {
  categories: any[];
  brands: any[];
  filters: FilterState;
  onFilterChange: (newFilters: Partial<FilterState>) => void;
  onReset: () => void;
}

export const FilterSidebar: React.FC<FilterSidebarProps> = ({
  categories,
  brands,
  filters,
  onFilterChange,
  onReset,
}) => {
  const pricePresets = [
    { label: 'Dưới 5 triệu', min: undefined, max: 5000000 },
    { label: '5tr - 15 triệu', min: 5000000, max: 15000000 },
    { label: '15tr - 30 triệu', min: 15000000, max: 30000000 },
    { label: 'Trên 30 triệu', min: 30000000, max: undefined },
  ];

  return (
    <aside className="space-y-6 text-left">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Bộ lọc tìm kiếm</h3>
        </div>
        <button
          onClick={onReset}
          className="text-[11px] font-semibold text-slate-400 hover:text-indigo-600 flex items-center gap-1 transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Đặt lại</span>
        </button>
      </div>

      {/* Categories Filter */}
      <div className="space-y-2.5">
        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-200 uppercase tracking-wider">
          Danh mục
        </h4>
        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
          {categories.map((cat) => {
            const isSelected = filters.categorySlug === cat.slug;
            return (
              <button
                key={cat.id}
                onClick={() =>
                  onFilterChange({
                    categorySlug: isSelected ? undefined : cat.slug,
                    categoryId: undefined,
                  })
                }
                className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                  isSelected
                    ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-300 font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span>{cat.name}</span>
                {cat._count?.products !== undefined && (
                  <span className="text-[10px] text-slate-400">({cat._count.products})</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Brands Filter */}
      <div className="space-y-2.5">
        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-200 uppercase tracking-wider">
          Thương hiệu
        </h4>
        <div className="space-y-1.5">
          {brands.map((b) => {
            const isSelected = filters.brandSlug === b.slug;
            return (
              <button
                key={b.id}
                onClick={() =>
                  onFilterChange({
                    brandSlug: isSelected ? undefined : b.slug,
                    brandId: undefined,
                  })
                }
                className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                  isSelected
                    ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-300 font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span>{b.name}</span>
                {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Price Presets */}
      <div className="space-y-2.5">
        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-200 uppercase tracking-wider">
          Khoảng giá
        </h4>
        <div className="grid grid-cols-1 gap-1.5">
          {pricePresets.map((p, idx) => {
            const isSelected = filters.minPrice === p.min && filters.maxPrice === p.max;
            return (
              <button
                key={idx}
                onClick={() =>
                  onFilterChange({
                    minPrice: isSelected ? undefined : p.min,
                    maxPrice: isSelected ? undefined : p.max,
                  })
                }
                className={`px-3 py-1.5 rounded-lg text-xs text-left transition-colors ${
                  isSelected
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        {/* Custom Price Range Inputs */}
        <div className="flex items-center gap-2 pt-2">
          <input
            type="number"
            placeholder="Từ"
            value={filters.minPrice || ''}
            onChange={(e) =>
              onFilterChange({ minPrice: e.target.value ? Number(e.target.value) : undefined })
            }
            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
          />
          <span className="text-slate-400 text-xs">-</span>
          <input
            type="number"
            placeholder="Đến"
            value={filters.maxPrice || ''}
            onChange={(e) =>
              onFilterChange({ maxPrice: e.target.value ? Number(e.target.value) : undefined })
            }
            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
          />
        </div>
      </div>

      {/* Rating Filter */}
      <div className="space-y-2.5">
        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-200 uppercase tracking-wider">
          Đánh giá tối thiểu
        </h4>
        <div className="space-y-1">
          {[5, 4, 3].map((stars) => {
            const isSelected = filters.rating === stars;
            return (
              <button
                key={stars}
                onClick={() => onFilterChange({ rating: isSelected ? undefined : stars })}
                className={`flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                  isSelected
                    ? 'bg-indigo-50 dark:bg-indigo-950/70 font-bold'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-0.5 text-amber-400">
                  {Array.from({ length: stars }).map((_, i) => (
                    <Star key={i} className="w-3 h-3 fill-amber-400" />
                  ))}
                </div>
                <span className="text-[11px] text-slate-500">Từ {stars} sao</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* In Stock Only Checkbox */}
      <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
        <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={!!filters.inStock}
            onChange={(e) => onFilterChange({ inStock: e.target.checked ? true : undefined })}
            className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
          />
          <span>Chỉ hiện sản phẩm còn hàng</span>
        </label>
      </div>
    </aside>
  );
};
