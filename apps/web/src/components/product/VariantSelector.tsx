import React from 'react';
import { ProductVariantDto } from '@techstore/shared';
import { formatCurrency } from '../../lib/utils';
import { Check } from 'lucide-react';

export interface VariantSelectorProps {
  variants: ProductVariantDto[];
  selectedVariant: ProductVariantDto | null;
  onSelectVariant: (variant: ProductVariantDto) => void;
}

export const VariantSelector: React.FC<VariantSelectorProps> = ({
  variants,
  selectedVariant,
  onSelectVariant,
}) => {
  if (!variants || variants.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-900 dark:text-slate-200 uppercase tracking-wider">
          Chọn phiên bản / Cấu hình
        </label>
        {selectedVariant && (
          <span className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
            {selectedVariant.name}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {variants.map((v) => {
          const isSelected = selectedVariant?.id === v.id;
          const isOutOfStock = v.stock <= 0;

          return (
            <button
              key={v.id}
              type="button"
              disabled={isOutOfStock}
              onClick={() => onSelectVariant(v)}
              className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all relative ${
                isSelected
                  ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40 ring-2 ring-indigo-500/20 shadow-sm'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
              } ${isOutOfStock ? 'opacity-50 cursor-not-allowed line-through' : 'cursor-pointer'}`}
            >
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <span>{v.name}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
                </div>
                <div className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mt-0.5">
                  {formatCurrency(v.salePrice || v.price)}
                </div>
              </div>

              <div className="text-[10px] text-right">
                {isOutOfStock ? (
                  <span className="text-rose-500 font-bold">Hết hàng</span>
                ) : (
                  <span className="text-slate-400">Còn {v.stock}</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
