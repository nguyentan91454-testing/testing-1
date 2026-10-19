import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ShoppingBag,
  Heart,
  Truck,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  Bot,
  Star,
  Plus,
  Minus,
  Check,
  Send,
  Zap,
} from 'lucide-react';
import { ProductGallery } from '../components/product/ProductGallery';
import { VariantSelector } from '../components/product/VariantSelector';
import { StarRating } from '../components/ui/StarRating';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Breadcrumb } from '../components/common/Breadcrumb';
import { SEOHelmet } from '../components/common/SEOHelmet';
import { toast } from '../components/ui/Toast';
import { useCartStore } from '../stores/cart.store';
import { useWishlistStore } from '../stores/wishlist.store';
import { useChatStore } from '../stores/chat.store';
import { useAuthStore } from '../stores/auth.store';
import { api } from '../api/client';
import { formatCurrency, formatDate, calculateDiscountPercent } from '../lib/utils';
import { ProductDto, ProductVariantDto } from '@techstore/shared';

export const ProductDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const { addItem } = useCartStore();
  const { toggleWishlist, isSaved } = useWishlistStore();
  const { openChat, sendMessage } = useChatStore();
  const { isAuthenticated } = useAuthStore();

  const [product, setProduct] = useState<any>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariantDto | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // Review Form state
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setIsLoading(true);
    api
      .get(`/products/detail/${slug}`)
      .then((res) => {
        const prod = res.data.data;
        setProduct(prod);
        if (prod.variants && prod.variants.length > 0) {
          setSelectedVariant(prod.variants[0]);
        }
      })
      .catch((err) => {
        console.error('Failed to load product', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [slug]);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto py-12 space-y-8 animate-pulse text-left">
        <div className="h-6 w-1/3 bg-slate-200 dark:bg-slate-800 rounded-lg" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="aspect-square bg-slate-200 dark:bg-slate-800 rounded-3xl" />
          <div className="space-y-4">
            <div className="h-8 w-3/4 bg-slate-200 dark:bg-slate-800 rounded-lg" />
            <div className="h-6 w-1/4 bg-slate-200 dark:bg-slate-800 rounded-lg" />
            <div className="h-24 bg-slate-200 dark:bg-slate-800 rounded-xl" />
            <div className="h-12 w-full bg-slate-200 dark:bg-slate-800 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="py-20 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          Không tìm thấy sản phẩm
        </h2>
        <p className="text-xs text-slate-500">Sản phẩm này có thể đã bị xóa hoặc đổi đường dẫn.</p>
        <Link to="/products">
          <Button variant="primary">Quay lại danh mục</Button>
        </Link>
      </div>
    );
  }

  const currentPrice = selectedVariant?.salePrice ?? selectedVariant?.price ?? product.salePrice ?? product.price;
  const originalPrice = selectedVariant?.price ?? product.price;
  const discountPercent = calculateDiscountPercent(originalPrice, currentPrice);
  const availableStock = selectedVariant ? selectedVariant.stock : product.stock;
  const isOutOfStock = availableStock <= 0;
  const isFavorite = isSaved(product.id);

  const handleAddToCart = async () => {
    if (isOutOfStock) return;
    try {
      await addItem(product.id, selectedVariant?.id, quantity);
      toast.success(`Đã thêm ${quantity} "${product.name}" vào giỏ hàng!`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể thêm vào giỏ hàng');
    }
  };

  const handleBuyNow = async () => {
    if (isOutOfStock) return;
    try {
      await addItem(product.id, selectedVariant?.id, quantity);
      navigate('/checkout');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể mua sản phẩm');
    }
  };

  const handleAskAIAboutThis = () => {
    openChat();
    sendMessage(`Tư vấn chi tiết và giải thích thông số kỹ thuật của sản phẩm "${product.name}"`);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.error('Vui lòng đăng nhập để gửi đánh giá');
      navigate('/login');
      return;
    }
    if (!newComment.trim()) {
      toast.error('Vui lòng nhập nội dung đánh giá');
      return;
    }

    setIsSubmittingReview(true);
    try {
      const res = await api.post('/reviews', {
        productId: product.id,
        rating: newRating,
        comment: newComment.trim(),
      });
      toast.success('Cảm ơn bạn đã gửi đánh giá sản phẩm!');
      setProduct({
        ...product,
        reviews: [res.data.data, ...(product.reviews || [])],
        reviewCount: (product.reviewCount || 0) + 1,
      });
      setNewComment('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể gửi đánh giá');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const specs = product.specifications || {};

  return (
    <div className="space-y-12 text-left">
      <SEOHelmet
        title={`${product.name} | TechStore`}
        description={product.shortDescription || product.description}
      />

      <Breadcrumb
        items={[
          { label: 'Sản phẩm', to: '/products' },
          { label: product.category?.name || 'Danh mục', to: `/products?categorySlug=${product.category?.slug}` },
          { label: product.name },
        ]}
      />

      {/* Main Product Info Header Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Left Gallery */}
        <div className="lg:col-span-6">
          <ProductGallery images={product.images} productName={product.name} />
        </div>

        {/* Right Product Details & Buy Actions */}
        <div className="lg:col-span-6 space-y-6">
          {/* Header & Badges */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-xs font-bold uppercase">
                {product.brand?.name}
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-500">{product.category?.name}</span>
            </div>

            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-slate-100 leading-tight">
              {product.name}
            </h1>

            {/* Rating and Reviews Counter */}
            <div className="flex items-center gap-3 pt-1">
              <StarRating
                rating={product.rating}
                reviewCount={product.reviewCount}
                showText
                size="md"
              />
              <span className="text-xs text-slate-400">|</span>
              <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Chính hãng 100% VAT</span>
              </div>
            </div>
          </div>

          {/* Pricing Box */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-indigo-50/80 to-purple-50/40 dark:from-slate-900 dark:to-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40">
            <div className="flex items-baseline gap-3">
              <span className="text-2xl sm:text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">
                {formatCurrency(currentPrice)}
              </span>
              {discountPercent > 0 && (
                <>
                  <span className="text-sm sm:text-base text-slate-400 line-through">
                    {formatCurrency(originalPrice)}
                  </span>
                  <Badge variant="danger" size="md" className="font-bold">
                    Tiết kiệm -{discountPercent}%
                  </Badge>
                </>
              )}
            </div>

            {/* Stock Status Indicator */}
            <div className="mt-3 flex items-center gap-2 text-xs font-semibold">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isOutOfStock ? 'bg-rose-500' : 'bg-emerald-500 animate-pulse'
                }`}
              />
              {isOutOfStock ? (
                <span className="text-rose-500 font-bold">Hiện đang tạm hết hàng</span>
              ) : (
                <span className="text-emerald-600 dark:text-emerald-400">
                  Còn sẵn {availableStock} sản phẩm trong kho
                </span>
              )}
            </div>
          </div>

          {/* Variants Selector */}
          {product.variants && product.variants.length > 0 && (
            <VariantSelector
              variants={product.variants}
              selectedVariant={selectedVariant}
              onSelectVariant={setSelectedVariant}
            />
          )}

          {/* Quantity Selector & Action CTAs */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-4">
              <div className="flex items-center border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 p-1">
                <button
                  type="button"
                  disabled={quantity <= 1 || isOutOfStock}
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 disabled:opacity-30"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="text-sm font-bold px-3 min-w-[36px] text-center">{quantity}</span>
                <button
                  type="button"
                  disabled={quantity >= availableStock || isOutOfStock}
                  onClick={() => setQuantity((q) => Math.min(availableStock, q + 1))}
                  className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 disabled:opacity-30"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={() => toggleWishlist(product.id)}
                className={`p-3 rounded-xl border transition-all ${
                  isFavorite
                    ? 'border-pink-500 bg-pink-50 dark:bg-pink-950/40 text-pink-600'
                    : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-pink-500'
                }`}
                title="Lưu yêu thích"
              >
                <Heart className={`w-5 h-5 ${isFavorite ? 'fill-pink-500' : ''}`} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                variant="outline"
                size="lg"
                disabled={isOutOfStock}
                onClick={handleAddToCart}
                leftIcon={<ShoppingBag className="w-5 h-5" />}
                className="w-full font-bold"
              >
                Thêm vào giỏ
              </Button>

              <Button
                variant="glow"
                size="lg"
                disabled={isOutOfStock}
                onClick={handleBuyNow}
                leftIcon={<Zap className="w-5 h-5" />}
                className="w-full font-bold"
              >
                Mua ngay
              </Button>
            </div>

            {/* AI Assistant Callout Button */}
            <button
              onClick={handleAskAIAboutThis}
              className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-all hover:scale-[1.01]"
            >
              <Bot className="w-4 h-4 text-indigo-500 animate-spin" />
              <span>Hỏi Trợ lý AI TechBot về sản phẩm này</span>
            </button>
          </div>

          {/* Store Guarantee Badges */}
          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-200 dark:border-slate-800 text-center">
            <div className="space-y-1">
              <Truck className="w-5 h-5 mx-auto text-indigo-600 dark:text-indigo-400" />
              <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200">Giao hàng miễn phí</p>
              <p className="text-[10px] text-slate-400">Đơn từ 1.000.000đ</p>
            </div>
            <div className="space-y-1">
              <RotateCcw className="w-5 h-5 mx-auto text-emerald-600 dark:text-emerald-400" />
              <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200">Đổi trả 30 ngày</p>
              <p className="text-[10px] text-slate-400">Lỗi 1 đổi 1 nhanh chóng</p>
            </div>
            <div className="space-y-1">
              <ShieldCheck className="w-5 h-5 mx-auto text-purple-600 dark:text-purple-400" />
              <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200">Bảo hành chính hãng</p>
              <p className="text-[10px] text-slate-400">12 - 24 tháng</p>
            </div>
          </div>
        </div>
      </div>

      {/* Specifications Table & Description Tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pt-6 border-t border-slate-200 dark:border-slate-800">
        {/* Description */}
        <div className="lg:col-span-7 space-y-4">
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
            Mô tả chi tiết sản phẩm
          </h2>
          <div className="p-6 rounded-2xl glass-panel space-y-3 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            <p className="font-semibold text-slate-900 dark:text-slate-100">
              {product.shortDescription}
            </p>
            <p>{product.description}</p>
          </div>
        </div>

        {/* Technical Specifications Table */}
        <div className="lg:col-span-5 space-y-4">
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
            Thông số kỹ thuật
          </h2>
          <div className="rounded-2xl glass-panel overflow-hidden border border-slate-200 dark:border-slate-800">
            <table className="w-full text-xs text-left">
              <tbody>
                <tr className="border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
                  <td className="py-2.5 px-4 font-semibold text-slate-500">Thương hiệu</td>
                  <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-slate-100">{product.brand?.name}</td>
                </tr>
                <tr className="border-b border-slate-100 dark:border-slate-800/80">
                  <td className="py-2.5 px-4 font-semibold text-slate-500">Danh mục</td>
                  <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-slate-100">{product.category?.name}</td>
                </tr>
                {Object.entries(specs).map(([key, val], idx) => (
                  <tr
                    key={key}
                    className={`border-b border-slate-100 dark:border-slate-800/80 ${
                      idx % 2 === 0 ? 'bg-slate-50/50 dark:bg-slate-900/50' : ''
                    }`}
                  >
                    <td className="py-2.5 px-4 font-semibold text-slate-500">{key}</td>
                    <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-slate-100">{String(val)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Customer Reviews Section */}
      <section className="space-y-6 pt-6 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
              Đánh giá từ khách hàng ({product.reviewCount || 0})
            </h2>
            <p className="text-xs text-slate-500">Nhận xét thực tế từ người mua hàng đã xác thực</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Write Review Form */}
          <div className="lg:col-span-5 p-6 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Gửi nhận xét của bạn
            </h3>

            <form onSubmit={handleSubmitReview} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Đánh giá số sao:
                </label>
                <StarRating
                  rating={newRating}
                  size="lg"
                  interactive
                  onRatingChange={setNewRating}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Nội dung đánh giá:
                </label>
                <textarea
                  rows={3}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Chia sẻ trải nghiệm sử dụng thực tế của bạn về sản phẩm..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isSubmittingReview}
                leftIcon={<Send className="w-3.5 h-3.5" />}
              >
                Gửi đánh giá
              </Button>
            </form>
          </div>

          {/* Reviews List */}
          <div className="lg:col-span-7 space-y-3">
            {(!product.reviews || product.reviews.length === 0) ? (
              <div className="p-8 text-center glass-panel rounded-2xl text-xs text-slate-500">
                Chưa có đánh giá nào cho sản phẩm này. Hãy là người đầu tiên nhận xét!
              </div>
            ) : (
              product.reviews.map((r: any) => (
                <div
                  key={r.id}
                  className="p-4 rounded-2xl glass-panel border border-slate-100 dark:border-slate-800 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                        {r.user?.fullName?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {r.user?.fullName || 'Khách hàng TechStore'}
                        </h4>
                        <div className="flex items-center gap-1.5 text-[10px]">
                          {r.isVerifiedPurchase && (
                            <span className="text-emerald-600 font-semibold flex items-center gap-0.5">
                              <Check className="w-3 h-3" /> Đã mua hàng
                            </span>
                          )}
                          <span className="text-slate-400">•</span>
                          <span className="text-slate-400">{formatDate(r.createdAt)}</span>
                        </div>
                      </div>
                    </div>

                    <StarRating rating={r.rating} size="sm" />
                  </div>

                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed pl-10">
                    {r.comment}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
