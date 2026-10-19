import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Heart, Check, Sparkles } from 'lucide-react';
import { formatCurrency, calculateDiscountPercent } from '../../lib/utils';
import { StarRating } from '../ui/StarRating';
import { Badge } from '../ui/Badge';
import { useCartStore } from '../../stores/cart.store';
import { useWishlistStore } from '../../stores/wishlist.store';
import { toast } from '../ui/Toast';
import { ProductDto } from '@techstore/shared';

export interface ProductCardProps {
  product: ProductDto;
  /** Show AI badge for recommendation sections */
  isAiRecommended?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, isAiRecommended = false }) => {
  const { addItem } = useCartStore();
  const { toggleWishlist, isSaved } = useWishlistStore();

  const discountPercent = calculateDiscountPercent(product.price, product.salePrice);
  const primaryImage =
    product.images && product.images.length > 0
      ? product.images.find((img) => img.isPrimary)?.url || product.images[0].url
      : 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=500';

  const isFavorite = isSaved(product.id);
  const isOutOfStock = product.stock <= 0;

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock) return;

    try {
      await addItem(product.id, undefined, 1);
      toast.success(`Đã thêm "${product.name}" vào giỏ hàng!`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể thêm vào giỏ hàng');
    }
  };

  const handleToggleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const saved = await toggleWishlist(product.id);
      if (saved) {
        toast.success(`Đã thêm "${product.name}" vào danh sách yêu thích!`);
      } else {
        toast.info(`Đã bỏ "${product.name}" khỏi danh sách yêu thích`);
      }
    } catch {
      toast.error('Vui lòng đăng nhập để lưu sản phẩm yêu thích');
    }
  };

  return (
    <div className="victorian-card group relative flex flex-col justify-between h-full overflow-hidden">
      {/* AI Recommended ribbon */}
      {isAiRecommended && (
        <div
          className="absolute top-0 left-0 right-0 z-20 flex justify-center py-1"
          style={{ background: 'linear-gradient(135deg, #8B0000, #A50000)', borderBottom: '1px solid rgba(212,175,55,0.4)' }}
        >
          <span className="ai-badge">
            <Sparkles className="w-2.5 h-2.5" />
            AI Pick
          </span>
        </div>
      )}

      <div className={isAiRecommended ? 'mt-6' : ''}>
        {/* ── Product Image ── */}
        <Link to={`/products/${product.slug}`} className="relative block overflow-hidden rounded-t-lg aspect-square"
          style={{ background: 'linear-gradient(145deg, #FFFFF0, #FDF6E3)' }}>
          <img
            src={primaryImage}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
          />

          {/* Warm gradient overlay on hover */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
            style={{ background: 'linear-gradient(to top, rgba(139,0,0,0.12) 0%, transparent 60%)' }} />

          {/* Badges Overlay */}
          <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 z-10">
            {discountPercent > 0 && (
              <Badge variant="danger" size="sm" className="font-extrabold shadow-sm">
                -{discountPercent}%
              </Badge>
            )}
            {isOutOfStock ? (
              <Badge variant="neutral" size="sm">Hết hàng</Badge>
            ) : product.stock <= 5 ? (
              <Badge variant="warning" size="sm">Chỉ còn {product.stock}</Badge>
            ) : null}
          </div>

          {/* Wishlist Button */}
          <button
            onClick={handleToggleWishlist}
            className="absolute top-2.5 right-2.5 p-2 rounded-full shadow-warm transition-all z-10 group/btn hover:scale-110 active:scale-95"
            style={{ background: 'rgba(255,255,240,0.92)', border: '1px solid rgba(212,175,55,0.4)' }}
            title="Lưu yêu thích"
          >
            <Heart
              className={`w-4 h-4 transition-colors ${
                isFavorite ? 'fill-brand-700 text-brand-700' : 'text-espresso-400 group-hover/btn:text-brand-700'
              }`}
            />
          </button>
        </Link>

        {/* ── Product Details ── */}
        <div className="px-3 pt-3 space-y-1.5">
          <div className="flex items-center justify-between text-[10px] font-sans">
            <span className="font-semibold text-gold-700 truncate max-w-[120px]">
              {product.brand?.name || 'Chính hãng'}
            </span>
            <span className="text-espresso-400 truncate max-w-[100px]">{product.category?.name}</span>
          </div>

          <Link to={`/products/${product.slug}`} className="block">
            <h3 className="text-xs sm:text-sm font-body font-bold text-espresso-800 line-clamp-2 leading-snug group-hover:text-brand-700 transition-colors">
              {product.name}
            </h3>
          </Link>

          {/* Rating */}
          <div className="pt-0.5">
            <StarRating rating={product.rating} reviewCount={product.reviewCount} showText size="sm" />
          </div>
        </div>
      </div>

      {/* ── Pricing & Add to Cart ── */}
      <div
        className="mt-3 mx-3 mb-3 pt-3 flex items-center justify-between gap-2"
        style={{ borderTop: '1px solid rgba(212,175,55,0.25)' }}
      >
        <div>
          <div className="text-sm sm:text-base font-sans font-extrabold text-brand-700">
            {formatCurrency(product.salePrice || product.price)}
          </div>
          {product.salePrice && (
            <div className="text-[11px] text-espresso-400 line-through font-sans">
              {formatCurrency(product.price)}
            </div>
          )}
        </div>

        <button
          onClick={handleAddToCart}
          disabled={isOutOfStock}
          className="p-2 sm:px-3 sm:py-2 rounded-lg text-cream-50 text-xs font-sans font-semibold transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-40"
          style={
            isOutOfStock
              ? { background: '#c7b0a5', cursor: 'not-allowed' }
              : {
                  background: 'linear-gradient(135deg, #C9A227, #D4AF37)',
                  border: '1px solid rgba(184,134,11,0.5)',
                  color: '#2C1810',
                  boxShadow: '0 2px 8px rgba(212,175,55,0.3)',
                }
          }
          title="Thêm vào giỏ"
        >
          <ShoppingBag className="w-4 h-4" />
          <span className="hidden sm:inline">Thêm</span>
        </button>
      </div>
    </div>
  );
};
