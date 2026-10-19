import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  Crown,
  Flame,
  Bot,
  Clock,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { ProductGrid } from '../components/product/ProductGrid';
import { SEOHelmet } from '../components/common/SEOHelmet';
import { useChatStore } from '../stores/chat.store';
import { api } from '../api/client';
import { ProductDto } from '@techstore/shared';

export const Home: React.FC = () => {
  const { openChat } = useChatStore();
  const [featuredProducts, setFeaturedProducts] = useState<ProductDto[]>([]);
  const [flashSaleProducts, setFlashSaleProducts] = useState<ProductDto[]>([]);
  const [aiProducts, setAiProducts] = useState<ProductDto[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Flash Sale Countdown Timer
  const [timeLeft, setTimeLeft] = useState({ hours: 14, minutes: 35, seconds: 20 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 };
        if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { hours: 23, minutes: 59, seconds: 59 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [featRes, catRes, flashRes] = await Promise.all([
          api.get('/products/featured?limit=8'),
          api.get('/categories'),
          api.get('/products?sort=popular&limit=4'),
        ]);
        setFeaturedProducts(featRes.data.data);
        setCategories(catRes.data.data);
        setFlashSaleProducts(flashRes.data.data);
        // Use featured products as AI recommendations (first 4)
        setAiProducts(featRes.data.data.slice(0, 4));
      } catch (err) {
        console.error('Failed to load home data', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="space-y-20 text-left">
      <SEOHelmet
        title="Maison Élégante — Đồ Gia Dụng Cao Cấp & Trang Trí Nội Thất Victoria"
        description="Khám phá bộ sưu tập đồ gia dụng cao cấp và trang trí nội thất phong cách Victoria. Trải nghiệm tư vấn từ Trợ lý AI thông minh."
      />

      {/* ══════════════════════════════════════════════
          HERO SECTION — Victorian Luxury Banner
      ═══════════════════════════════════════════════ */}
      <section
        className="relative rounded-2xl overflow-hidden victorian-bg"
        style={{
          background: 'linear-gradient(135deg, #8B0000 0%, #6B0000 40%, #4a0000 100%)',
          border: '1.5px solid rgba(212,175,55,0.5)',
          boxShadow: '0 20px 60px rgba(139,0,0,0.3), inset 0 1px 0 rgba(232,197,71,0.2)',
        }}
      >
        {/* Decorative ambient glow */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(212,175,55,0.12) 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(212,175,55,0.08) 0%, transparent 70%)' }} />

        {/* Gold ornament top border */}
        <div className="absolute top-0 left-0 right-0 h-0.5"
          style={{ background: 'linear-gradient(90deg, transparent, #D4AF37, #E8C547, #D4AF37, transparent)' }} />

        <div className="relative z-10 p-8 sm:p-12 lg:p-16 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-6">
            {/* AI / Collection badge */}
            <div className="flex items-center gap-2">
              <span
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full font-sans text-xs font-bold tracking-widest uppercase"
                style={{ background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.5)', color: '#E8C547' }}
              >
                <Crown className="w-3.5 h-3.5" />
                Bộ Sưu Tập Mùa Thu 2026
              </span>
            </div>

            <h1
              className="text-3xl sm:text-5xl lg:text-6xl font-bold text-cream-50 leading-[1.1]"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Không gian sống{' '}
              <span className="text-gold-gradient italic">sang trọng</span>
              <br />
              <span className="text-gold-500">xứng tầm quý tộc.</span>
            </h1>

            <p className="text-sm sm:text-base text-cream-300 max-w-xl leading-relaxed font-body">
              Khám phá bộ sưu tập đồ gia dụng cao cấp và trang trí nội thất phong cách Victoria hiện đại. 
              Mỗi sản phẩm là một tác phẩm nghệ thuật — được tuyển chọn bởi AI và chuyên gia nội thất hàng đầu.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link to="/products">
                <Button
                  size="lg"
                  variant="gold"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Khám phá bộ sưu tập
                </Button>
              </Link>

              <Button
                size="lg"
                variant="outline"
                onClick={openChat}
                leftIcon={<Sparkles className="w-4 h-4 text-gold-400" />}
                className="text-cream-100 border-cream-100/30 hover:bg-white/10"
              >
                Tư vấn với AI
              </Button>
            </div>

            {/* Micro trust stats */}
            <div
              className="grid grid-cols-3 gap-4 pt-6"
              style={{ borderTop: '1px solid rgba(212,175,55,0.2)' }}
            >
              <div>
                <div className="text-xl sm:text-2xl font-sans font-extrabold text-gold-400">500+</div>
                <div className="text-[11px] text-cream-400 font-sans font-medium">Sản phẩm cao cấp</div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-sans font-extrabold text-gold-400">30 Ngày</div>
                <div className="text-[11px] text-cream-400 font-sans font-medium">Đổi trả miễn phí</div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-sans font-extrabold text-gold-400">24/7</div>
                <div className="text-[11px] text-cream-400 font-sans font-medium">Hỗ trợ AI & chuyên gia</div>
              </div>
            </div>
          </div>

          {/* Hero product showcase */}
          <div className="lg:col-span-5 flex justify-center">
            <div
              className="relative w-full max-w-md aspect-square rounded-2xl overflow-hidden p-4 shadow-2xl group"
              style={{
                background: 'rgba(255,255,240,0.08)',
                border: '1.5px solid rgba(212,175,55,0.4)',
                backdropFilter: 'blur(4px)',
              }}
            >
              <img
                src="https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800"
                alt="Victorian Luxury Sofa"
                className="w-full h-full object-cover rounded-xl group-hover:scale-105 transition-transform duration-700"
              />
              {/* Product info float card */}
              <div
                className="absolute bottom-6 left-6 right-6 p-3 rounded-xl"
                style={{
                  background: 'rgba(253,246,227,0.95)',
                  border: '1px solid rgba(212,175,55,0.5)',
                  boxShadow: '0 4px 16px rgba(62,39,35,0.15)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-sans uppercase tracking-widest text-gold-700 font-bold">Nổi bật tuần</span>
                    <h4 className="text-xs font-body font-bold text-espresso-900">Sofa Nhung Burgundy Imperial</h4>
                  </div>
                  <span className="text-xs font-sans font-extrabold text-brand-700">28.500.000 ₫</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Gold ornament bottom border */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5"
          style={{ background: 'linear-gradient(90deg, transparent, #D4AF37, #E8C547, #D4AF37, transparent)' }} />
      </section>

      {/* ══════════════════════════════════════════════
          AI PRODUCT RECOMMENDATION SECTION
      ═══════════════════════════════════════════════ */}
      <section className="space-y-6">
        {/* Section Header with Victorian ornament */}
        <div
          className="relative p-6 sm:p-8 rounded-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(139,0,0,0.06) 0%, rgba(212,175,55,0.06) 100%)',
            border: '1.5px solid rgba(212,175,55,0.35)',
          }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="ai-badge">
                  <Sparkles className="w-2.5 h-2.5" />
                  AI Curated
                </span>
              </div>
              <h2
                className="text-xl sm:text-2xl font-bold text-espresso-900"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                Dành Riêng Cho Bạn
              </h2>
              <div className="gold-accent-line" />
              <p className="text-xs text-espresso-500 font-sans pt-1">
                Trợ lý AI đã phân tích sở thích và đề xuất những sản phẩm hoàn hảo nhất dành cho bạn
              </p>
            </div>
            <Link
              to="/products"
              className="text-xs font-sans font-bold text-brand-700 hover:text-brand-600 flex items-center gap-1 shrink-0 transition-colors"
            >
              <span>Xem tất cả</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        <ProductGrid products={aiProducts} isLoading={isLoading} skeletonCount={4} isAiSection />
      </section>

      {/* ══════════════════════════════════════════════
          FLASH SALE — Victorian Style
      ═══════════════════════════════════════════════ */}
      <section className="space-y-6">
        <div
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-2xl"
          style={{
            background: 'linear-gradient(135deg, rgba(139,0,0,0.08) 0%, rgba(165,0,0,0.05) 100%)',
            border: '1px solid rgba(139,0,0,0.2)',
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg text-gold-400 flex items-center justify-center shadow-burgundy"
              style={{ background: 'linear-gradient(135deg, #8B0000, #A50000)', border: '1px solid rgba(212,175,55,0.4)' }}
            >
              <Flame className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <h2
                className="text-lg sm:text-xl font-bold text-espresso-900 flex items-center gap-2"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                <span>Ưu Đãi Đặc Biệt</span>
                <span
                  className="text-[10px] font-sans font-bold px-2 py-0.5 rounded-md text-cream-50"
                  style={{ background: '#8B0000', border: '1px solid rgba(212,175,55,0.4)' }}
                >
                  HOT
                </span>
              </h2>
              <p className="text-xs text-espresso-400 font-sans">Giảm giá sâu các sản phẩm nội thất cao cấp</p>
            </div>
          </div>

          {/* Countdown */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs font-sans font-semibold text-espresso-500 mr-1">
              <Clock className="w-4 h-4 text-brand-700" />
              <span>Kết thúc sau:</span>
            </div>
            <div className="flex items-center gap-1 font-mono font-bold text-xs">
              <span
                className="px-2.5 py-1.5 rounded-lg text-cream-50 font-sans"
                style={{ background: '#2C1810' }}
              >
                {String(timeLeft.hours).padStart(2, '0')}
              </span>
              <span className="text-espresso-600">:</span>
              <span
                className="px-2.5 py-1.5 rounded-lg text-cream-50 font-sans"
                style={{ background: '#2C1810' }}
              >
                {String(timeLeft.minutes).padStart(2, '0')}
              </span>
              <span className="text-espresso-600">:</span>
              <span
                className="px-2.5 py-1.5 rounded-lg text-cream-50 font-sans"
                style={{ background: '#8B0000', border: '1px solid rgba(212,175,55,0.4)' }}
              >
                {String(timeLeft.seconds).padStart(2, '0')}
              </span>
            </div>
          </div>
        </div>

        <ProductGrid products={flashSaleProducts} isLoading={isLoading} skeletonCount={4} />
      </section>

      {/* ══════════════════════════════════════════════
          FEATURED CATEGORIES — Victorian Card Grid
      ═══════════════════════════════════════════════ */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2
              className="text-xl sm:text-2xl font-bold text-espresso-900"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Danh Mục Nổi Bật
            </h2>
            <div className="gold-accent-line" />
          </div>
          <Link to="/products" className="text-xs font-sans font-bold text-brand-700 hover:text-brand-600 flex items-center gap-1 transition-colors">
            <span>Xem tất cả</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {categories.slice(0, 5).map((cat) => (
            <Link
              key={cat.id}
              to={`/products?categorySlug=${cat.slug}`}
              className="group relative rounded-xl overflow-hidden flex flex-col justify-between h-40 transition-all duration-300 hover:-translate-y-1"
              style={{
                background: 'linear-gradient(145deg, #FFFFF0, #FDF6E3)',
                border: '1px solid rgba(212,175,55,0.35)',
                boxShadow: '0 2px 8px rgba(62,39,35,0.06)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(212,175,55,0.7)';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(139,0,0,0.1)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(212,175,55,0.35)';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(62,39,35,0.06)';
              }}
            >
              <div className="relative z-10 p-3">
                <h3
                  className="text-xs sm:text-sm font-bold text-espresso-800 group-hover:text-brand-700 transition-colors"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  {cat.name}
                </h3>
                <p className="text-[10px] text-espresso-400 mt-0.5 font-sans">
                  {cat._count?.products || 0} sản phẩm
                </p>
              </div>

              <img
                src={cat.imageUrl || 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=300'}
                alt={cat.name}
                className="absolute right-2 bottom-2 w-20 h-20 object-contain opacity-75 group-hover:scale-110 group-hover:opacity-95 transition-all duration-300"
              />

              {/* Gold corner accent */}
              <div
                className="absolute top-0 right-0 w-12 h-12 opacity-30 group-hover:opacity-60 transition-opacity"
                style={{
                  background: 'linear-gradient(225deg, rgba(212,175,55,0.4) 0%, transparent 60%)',
                  borderTopRightRadius: '0.75rem',
                }}
              />
            </Link>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          FEATURED PRODUCTS
      ═══════════════════════════════════════════════ */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2
              className="text-xl sm:text-2xl font-bold text-espresso-900"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Sản Phẩm Đánh Giá Cao
            </h2>
            <div className="gold-accent-line" />
            <p className="text-xs text-espresso-400 font-sans pt-1">Những sản phẩm nội thất cao cấp được yêu thích nhất</p>
          </div>
          <Link to="/products" className="text-xs font-sans font-bold text-brand-700 hover:text-brand-600 flex items-center gap-1 transition-colors">
            <span>Xem thêm</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <ProductGrid products={featuredProducts} isLoading={isLoading} skeletonCount={8} />
      </section>

      {/* ══════════════════════════════════════════════
          AI CHATBOT SHOWCASE CARD
      ═══════════════════════════════════════════════ */}
      <section
        className="rounded-2xl overflow-hidden relative victorian-bg"
        style={{
          background: 'linear-gradient(135deg, #3D1F0D 0%, #2C1810 50%, #1A0F0A 100%)',
          border: '1.5px solid rgba(212,175,55,0.45)',
          boxShadow: '0 16px 48px rgba(62,39,35,0.25)',
        }}
      >
        {/* Gold top/bottom borders */}
        <div className="absolute top-0 left-0 right-0 h-0.5"
          style={{ background: 'linear-gradient(90deg, transparent, #D4AF37, #E8C547, #D4AF37, transparent)' }} />
        <div className="absolute bottom-0 left-0 right-0 h-0.5"
          style={{ background: 'linear-gradient(90deg, transparent, #D4AF37, #E8C547, #D4AF37, transparent)' }} />

        {/* Ambient glow */}
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(212,175,55,0.08) 0%, transparent 70%)' }} />

        <div className="relative z-10 p-8 sm:p-12 max-w-2xl space-y-5">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full font-sans text-xs font-bold tracking-widest"
            style={{
              background: 'rgba(212,175,55,0.12)',
              border: '1px solid rgba(212,175,55,0.4)',
              color: '#E8C547',
            }}
          >
            <Bot className="w-4 h-4" />
            <span>Trợ Lý Trang Trí AI — Maison Assistant</span>
          </div>

          <h2
            className="text-2xl sm:text-4xl font-bold text-cream-50 leading-tight"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Bạn muốn thiết kế phòng khách sang trọng? Hãy để AI{' '}
            <span className="text-gold-gradient italic">gợi ý cho bạn!</span>
          </h2>

          <p className="text-xs sm:text-sm text-cream-400 leading-relaxed font-body">
            Trợ lý AI phân tích phong cách, diện tích và ngân sách của bạn để đề xuất bộ sưu tập đồ nội thất phù hợp nhất. 
            Từ sofa nhung Burgundy, đèn chùm pha lê đến thảm Ba Tư — chúng tôi có tất cả.
          </p>

          <div className="pt-2">
            <Button
              variant="gold"
              size="lg"
              onClick={openChat}
              leftIcon={<Sparkles className="w-4 h-4" />}
            >
              Mở Trợ lý AI Trang Trí
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};
