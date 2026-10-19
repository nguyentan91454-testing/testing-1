import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShoppingBag,
  Heart,
  User,
  Search,
  Moon,
  Sun,
  Menu,
  X,
  Sparkles,
  Package,
  LogOut,
  ChevronDown,
  LayoutDashboard,
  Crown,
} from 'lucide-react';
import { useAuthStore } from '../../stores/auth.store';
import { useCartStore } from '../../stores/cart.store';
import { useWishlistStore } from '../../stores/wishlist.store';
import { useThemeStore } from '../../stores/theme.store';
import { useChatStore } from '../../stores/chat.store';
import { api } from '../../api/client';
import { formatCurrency } from '../../lib/utils';
import { Role } from '@techstore/shared';

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { cart, openCartDrawer } = useCartStore();
  const { items: wishlistItems } = useWishlistStore();
  const { isDark, toggleTheme } = useThemeStore();
  const { openChat } = useChatStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchPreview, setShowSearchPreview] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);

  // Fetch categories for navbar
  useEffect(() => {
    api.get('/categories')
      .then((res) => setCategories(res.data.data))
      .catch(() => {});
  }, []);

  // Debounced search preview
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await api.get(`/products?search=${encodeURIComponent(searchQuery)}&limit=5`);
        setSearchResults(res.data.data);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click outside search preview to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchPreview(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setShowSearchPreview(false);
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const totalCartCount = cart?.itemCount || 0;
  const isAdmin = user?.role === Role.ADMIN || user?.role === Role.SUPER_ADMIN;

  return (
    <header className="sticky top-0 z-40 w-full transition-colors"
      style={{ background: 'rgba(253,246,227,0.96)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(212,175,55,0.35)' }}>

      {/* ── Top Announcement Banner (Victorian Gold) ── */}
      <div
        className="text-cream-50 text-[11px] py-1.5 px-4 text-center font-sans font-medium flex items-center justify-center gap-2"
        style={{ background: 'linear-gradient(135deg, #8B0000 0%, #A50000 50%, #6B0000 100%)', borderBottom: '1px solid rgba(212,175,55,0.4)' }}
      >
        <Crown className="w-3.5 h-3.5 text-gold-400 shrink-0" />
        <span>
          Ưu đãi đặc biệt: Nhập mã{' '}
          <strong className="text-gold-300 tracking-wider">HOMEDECOR10</strong>
          {' '}— Giảm 10% đơn hàng đầu tiên!
        </span>
        <button
          onClick={openChat}
          className="underline hover:text-gold-300 ml-2 font-bold cursor-pointer hidden sm:inline transition-colors"
        >
          Hỏi Trợ lý AI ngay →
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">

          {/* ── Victorian Logo ── */}
          <Link to="/" className="flex items-center gap-3 shrink-0 group">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-gold-400 shadow-burgundy group-hover:shadow-burgundy-lg transition-all"
              style={{ background: 'linear-gradient(135deg, #8B0000, #A50000)', border: '1px solid rgba(212,175,55,0.5)' }}
            >
              <Crown className="w-5 h-5" />
            </div>
            <div className="flex flex-col leading-none">
              <span
                className="text-lg font-heading font-bold tracking-tight"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                <span className="text-gold-gradient">Maison</span>
                <span className="text-espresso-900 dark:text-cream-100"> Élégante</span>
              </span>
              <span className="text-[9px] text-espresso-400 font-sans font-medium tracking-[0.2em] uppercase -mt-0.5">
                Home Décor & Living
              </span>
            </div>
          </Link>

          {/* ── AI Search Bar ── */}
          <div ref={searchRef} className="relative flex-1 max-w-xl hidden md:block">
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-espresso-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSearchPreview(true);
                }}
                placeholder="Tìm bộ sofa nhung, đèn chùm pha lê, thảm Ba Tư..."
                className="w-full pl-10 pr-4 py-2 text-xs md:text-sm rounded-lg font-sans text-espresso-800 placeholder-espresso-400 focus:outline-none transition-all"
                style={{
                  background: 'rgba(255,255,240,0.8)',
                  border: '1px solid rgba(212,175,55,0.4)',
                  color: '#2C1810',
                }}
                onFocus={(e) => {
                  setShowSearchPreview(true);
                  (e.target as HTMLInputElement).style.boxShadow = '0 0 0 2px rgba(212,175,55,0.35)';
                  (e.target as HTMLInputElement).style.borderColor = 'rgba(212,175,55,0.7)';
                }}
                onBlur={(e) => {
                  (e.target as HTMLInputElement).style.boxShadow = '';
                  (e.target as HTMLInputElement).style.borderColor = 'rgba(212,175,55,0.4)';
                }}
              />
            </form>

            {/* ── Search Preview Dropdown ── */}
            {showSearchPreview && searchQuery.trim().length > 0 && (
              <div
                className="absolute top-full left-0 right-0 mt-2 p-3 rounded-xl shadow-warm-lg border z-50 animate-slide-up"
                style={{ background: 'rgba(255,255,240,0.98)', borderColor: 'rgba(212,175,55,0.4)' }}
              >
                {isSearching ? (
                  <div className="py-5 text-center text-xs text-espresso-400 font-sans">Đang tìm kiếm sản phẩm...</div>
                ) : searchResults.length > 0 ? (
                  <div className="space-y-2">
                    <div className="text-[10px] font-sans font-bold text-espresso-400 px-2 uppercase tracking-widest">
                      Kết quả gợi ý ({searchResults.length})
                    </div>
                    {searchResults.map((product) => (
                      <Link
                        key={product.id}
                        to={`/products/${product.slug}`}
                        onClick={() => setShowSearchPreview(false)}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-cream-100 transition-colors group"
                      >
                        <img
                          src={product.images[0]?.url || 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=100'}
                          alt={product.name}
                          className="w-11 h-11 object-cover rounded-md shrink-0"
                          style={{ border: '1px solid rgba(212,175,55,0.35)' }}
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-body font-semibold text-espresso-800 truncate group-hover:text-brand-700 transition-colors">
                            {product.name}
                          </h4>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs font-sans font-bold text-brand-700">
                              {formatCurrency(product.salePrice || product.price)}
                            </span>
                            {product.salePrice && (
                              <span className="text-[10px] text-espresso-400 line-through font-sans">
                                {formatCurrency(product.price)}
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                    <button
                      onClick={handleSearchSubmit}
                      className="w-full text-center py-2 text-xs font-sans font-semibold text-brand-700 hover:text-brand-600 border-t mt-1 transition-colors"
                      style={{ borderColor: 'rgba(212,175,55,0.3)' }}
                    >
                      Xem tất cả kết quả cho "{searchQuery}" →
                    </button>
                  </div>
                ) : (
                  <div className="py-5 text-center text-xs text-espresso-400 font-sans">
                    Không tìm thấy sản phẩm nào khớp với "{searchQuery}"
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Action Buttons ── */}
          <div className="flex items-center gap-2 sm:gap-3">

            {/* AI Assistant Quick Trigger */}
            <button
              onClick={openChat}
              className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg font-sans text-xs font-semibold transition-all hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, #8B0000, #A50000)',
                border: '1px solid rgba(212,175,55,0.5)',
                color: '#D4AF37',
              }}
            >
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              <span>Trợ lý AI</span>
            </button>

            {/* Dark / Light Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-espresso-600 hover:bg-cream-200 dark:text-cream-300 dark:hover:bg-espresso-800 transition-colors"
              title="Đổi giao diện"
            >
              {isDark
                ? <Sun className="w-5 h-5 text-gold-400" />
                : <Moon className="w-5 h-5 text-espresso-600" />
              }
            </button>

            {/* Wishlist Icon */}
            <Link
              to="/wishlist"
              className="relative p-2 rounded-lg text-espresso-600 hover:bg-cream-200 dark:text-cream-300 dark:hover:bg-espresso-800 transition-colors"
              title="Danh sách yêu thích"
            >
              <Heart className="w-5 h-5" />
              {wishlistItems.length > 0 && (
                <span
                  className="absolute top-1 right-1 w-4 h-4 rounded-full text-cream-50 text-[10px] font-sans font-bold flex items-center justify-center animate-pulse"
                  style={{ background: '#8B0000' }}
                >
                  {wishlistItems.length}
                </span>
              )}
            </Link>

            {/* Cart Icon */}
            <button
              onClick={openCartDrawer}
              className="relative p-2 rounded-lg text-espresso-600 hover:bg-cream-200 dark:text-cream-300 dark:hover:bg-espresso-800 transition-colors"
              title="Giỏ hàng"
            >
              <ShoppingBag className="w-5 h-5" />
              {totalCartCount > 0 && (
                <span
                  className="absolute top-1 right-1 w-4 h-4 rounded-full text-cream-50 text-[10px] font-sans font-bold flex items-center justify-center animate-bounce"
                  style={{ background: 'linear-gradient(135deg, #C9A227, #D4AF37)' }}
                >
                  {totalCartCount}
                </span>
              )}
            </button>

            {/* User Account / Auth */}
            <div className="relative">
              {isAuthenticated && user ? (
                <div className="relative">
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-cream-200 dark:hover:bg-espresso-800 transition-colors"
                  >
                    {user.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt={user.fullName}
                        className="w-8 h-8 rounded-lg object-cover"
                        style={{ border: '1.5px solid rgba(212,175,55,0.5)' }}
                      />
                    ) : (
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-cream-50 text-xs font-sans font-bold"
                        style={{ background: 'linear-gradient(135deg, #8B0000, #A50000)', border: '1px solid rgba(212,175,55,0.4)' }}
                      >
                        {user.fullName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="text-xs font-sans font-semibold text-espresso-800 dark:text-cream-200 hidden xl:inline max-w-[100px] truncate">
                      {user.fullName}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-espresso-400 hidden xl:inline" />
                  </button>

                  {/* User Dropdown */}
                  {isUserMenuOpen && (
                    <div
                      className="absolute right-0 mt-2 w-56 p-2 rounded-xl shadow-warm-lg border z-50 animate-slide-up"
                      style={{ background: 'rgba(255,255,240,0.98)', borderColor: 'rgba(212,175,55,0.4)' }}
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      <div className="px-3 py-2 mb-1" style={{ borderBottom: '1px solid rgba(212,175,55,0.25)' }}>
                        <p className="text-xs font-body font-bold text-espresso-900 truncate">{user.fullName}</p>
                        <p className="text-[11px] text-espresso-400 truncate font-sans">{user.email}</p>
                        <span
                          className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-sans font-bold"
                          style={{ background: 'linear-gradient(135deg, #8B0000, #A50000)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.4)' }}
                        >
                          {user.role}
                        </span>
                      </div>

                      <div className="py-1">
                        {isAdmin && (
                          <Link
                            to="/admin"
                            className="flex items-center gap-2 px-3 py-2 text-xs font-sans font-semibold text-brand-700 hover:bg-cream-100 rounded-lg transition-colors"
                          >
                            <LayoutDashboard className="w-4 h-4" />
                            <span>Trang Quản Trị</span>
                          </Link>
                        )}
                        <Link
                          to="/orders"
                          className="flex items-center gap-2 px-3 py-2 text-xs font-sans text-espresso-700 hover:bg-cream-100 rounded-lg transition-colors"
                        >
                          <Package className="w-4 h-4" />
                          <span>Đơn mua của tôi</span>
                        </Link>
                        <Link
                          to="/profile"
                          className="flex items-center gap-2 px-3 py-2 text-xs font-sans text-espresso-700 hover:bg-cream-100 rounded-lg transition-colors"
                        >
                          <User className="w-4 h-4" />
                          <span>Hồ sơ cá nhân</span>
                        </Link>
                      </div>

                      <div className="pt-1" style={{ borderTop: '1px solid rgba(212,175,55,0.25)' }}>
                        <button
                          onClick={logout}
                          className="flex items-center gap-2 w-full px-3 py-2 text-xs font-sans font-medium text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors text-left"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Đăng xuất</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <Link
                    to="/login"
                    className="px-3.5 py-1.5 rounded-lg text-xs font-sans font-semibold text-espresso-700 hover:bg-cream-200 dark:text-cream-200 dark:hover:bg-espresso-800 transition-colors"
                  >
                    Đăng nhập
                  </Link>
                  <Link
                    to="/register"
                    className="px-3.5 py-1.5 rounded-lg text-xs font-sans font-semibold text-cream-50 hover:scale-105 transition-all shadow-sm"
                    style={{ background: 'linear-gradient(135deg, #8B0000, #A50000)', border: '1px solid rgba(212,175,55,0.5)' }}
                  >
                    Đăng ký
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile Hamburger */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-lg text-espresso-600 dark:text-cream-300 hover:bg-cream-200 dark:hover:bg-espresso-800 md:hidden transition-colors"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* ── Secondary Category Navbar ── */}
        <nav
          className="hidden md:flex items-center gap-6 py-2 overflow-x-auto text-xs font-sans font-medium text-espresso-500"
          style={{ borderTop: '1px solid rgba(212,175,55,0.2)' }}
        >
          <Link to="/products" className="hover:text-brand-700 transition-colors whitespace-nowrap">
            Tất cả sản phẩm
          </Link>
          {categories.slice(0, 7).map((cat) => (
            <Link
              key={cat.id}
              to={`/products?categorySlug=${cat.slug}`}
              className="hover:text-brand-700 transition-colors whitespace-nowrap"
            >
              {cat.name}
            </Link>
          ))}
        </nav>
      </div>

      {/* ── Mobile Drawer ── */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden p-4 space-y-4 animate-slide-up"
          style={{ background: 'rgba(255,255,240,0.98)', borderTop: '1px solid rgba(212,175,55,0.35)' }}
        >
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-espresso-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm sản phẩm..."
              className="w-full pl-10 pr-4 py-2 text-xs font-sans rounded-lg focus:outline-none"
              style={{ background: 'rgba(253,246,227,0.9)', border: '1px solid rgba(212,175,55,0.4)', color: '#2C1810' }}
            />
          </form>

          <div className="space-y-1">
            <div className="text-[10px] font-sans font-bold text-espresso-400 uppercase tracking-widest px-2">Danh mục</div>
            <Link
              to="/products"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-xs font-sans font-medium text-espresso-700 hover:bg-cream-100 transition-colors"
            >
              Tất cả sản phẩm
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat.id}
                to={`/products?categorySlug=${cat.slug}`}
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-xs font-sans font-medium text-espresso-700 hover:bg-cream-100 transition-colors"
              >
                {cat.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
};
