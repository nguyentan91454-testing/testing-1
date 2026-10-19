import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Star, ExternalLink } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { useCartStore } from '../../stores/cart.store';
import { toast } from '../ui/Toast';
import { ProductRecommendation } from '@techstore/shared';

export interface ProductSuggestionCardProps {
  product: ProductRecommendation;
}

export const ProductSuggestionCard: React.FC<ProductSuggestionCardProps> = ({ product }) => {
  const { addItem } = useCartStore();

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      await addItem(product.id, undefined, 1);
      toast.success(`Đã thêm "${product.name}" vào giỏ hàng!`);
    } catch {
      toast.error('Không thể thêm vào giỏ hàng');
    }
  };

  return (
    <div
      className="flex items-center gap-3 p-2.5 rounded-xl transition-all text-left group"
      style={{
        background: 'rgba(255,255,240,0.9)',
        border: '1px solid rgba(212,175,55,0.35)',
        boxShadow: '0 1px 4px rgba(62,39,35,0.06)',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(212,175,55,0.65)';
        (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(139,0,0,0.08)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(212,175,55,0.35)';
        (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 4px rgba(62,39,35,0.06)';
      }}
    >
      <img
        src={product.imageUrl || 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=100'}
        alt={product.name}
        className="w-14 h-14 object-cover rounded-lg shrink-0"
        style={{ border: '1px solid rgba(212,175,55,0.35)' }}
      />

      <div className="flex-1 min-w-0">
        <Link
          to={`/products/${product.slug}`}
          className="text-xs font-body font-bold text-espresso-800 hover:text-brand-700 line-clamp-1 group-hover:text-brand-700 transition-colors"
        >
          {product.name}
        </Link>

        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs font-sans font-extrabold text-brand-700">
            {formatCurrency(product.price)}
          </span>
          <div className="flex items-center text-[10px] text-gold-700 font-sans font-semibold">
            <Star className="w-2.5 h-2.5 fill-gold-500 text-gold-500 mr-0.5" />
            {product.rating}
          </div>
        </div>

        {product.reason && (
          <p className="text-[10px] text-espresso-400 font-sans line-clamp-1 mt-0.5">
            ✦ {product.reason}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1 shrink-0">
        <button
          onClick={handleAddToCart}
          className="p-1.5 rounded-lg font-sans text-[10px] font-bold flex items-center gap-1 transition-all active:scale-95"
          style={{
            background: 'linear-gradient(135deg, #C9A227, #D4AF37)',
            border: '1px solid rgba(184,134,11,0.5)',
            color: '#2C1810',
            boxShadow: '0 1px 4px rgba(212,175,55,0.3)',
          }}
          title="Thêm vào giỏ"
        >
          <ShoppingBag className="w-3 h-3" />
          <span className="hidden sm:inline">Thêm</span>
        </button>

        <Link
          to={`/products/${product.slug}`}
          className="p-1.5 rounded-lg text-center transition-colors hover:text-brand-700"
          style={{
            background: 'rgba(253,246,227,0.8)',
            border: '1px solid rgba(212,175,55,0.3)',
            color: '#8D6E63',
          }}
          title="Xem chi tiết"
        >
          <ExternalLink className="w-3 h-3 mx-auto" />
        </Link>
      </div>
    </div>
  );
};
