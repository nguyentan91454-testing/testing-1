import React from 'react';
import { Link } from 'react-router-dom';
import { Crown, ShieldCheck, Truck, RotateCcw, Headphones, Heart, Sparkles, MapPin, Phone, Mail } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer
      className="mt-20 transition-colors"
      style={{ background: 'rgba(253,246,227,0.5)', borderTop: '1px solid rgba(212,175,55,0.3)' }}
    >
      {/* ── Value Props Bar ── */}
      <div style={{ borderBottom: '1px solid rgba(212,175,55,0.2)' }} className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: Truck, label: 'Giao hàng miễn phí', desc: 'Đơn hàng từ 2.000.000₫', color: '#8B0000' },
              { icon: ShieldCheck, label: 'Chính hãng 100%', desc: 'Bảo hành theo NSX', color: '#2E7D32' },
              { icon: RotateCcw, label: 'Đổi trả 30 ngày', desc: 'Lỗi 1 đổi 1 nhanh chóng', color: '#C9A227' },
              { icon: Headphones, label: 'Hỗ trợ 24/7 & AI', desc: 'Tư vấn thiết kế tức thì', color: '#8B0000' },
            ].map(({ icon: Icon, label, desc, color }) => (
              <div key={label} className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                  style={{
                    background: `${color}15`,
                    border: '1px solid rgba(212,175,55,0.3)',
                    color,
                  }}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-sans font-bold text-espresso-900">{label}</h4>
                  <p className="text-[11px] text-espresso-400 font-sans">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main Footer Links ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">

          {/* Brand Info */}
          <div className="md:col-span-2 space-y-4">
            <Link to="/" className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center text-gold-400"
                style={{
                  background: 'linear-gradient(135deg, #8B0000, #A50000)',
                  border: '1px solid rgba(212,175,55,0.5)',
                }}
              >
                <Crown className="w-5 h-5" />
              </div>
              <div>
                <span
                  className="text-lg font-bold block"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  <span className="text-gold-gradient">Maison</span>
                  <span className="text-espresso-800"> Élégante</span>
                </span>
                <span className="text-[9px] font-sans text-espresso-400 tracking-widest uppercase">Home Décor & Living</span>
              </div>
            </Link>

            <p className="text-xs text-espresso-500 font-body max-w-sm leading-relaxed">
              Nơi hội tụ của những sản phẩm đồ gia dụng cao cấp và trang trí nội thất phong cách Victoria. 
              Mỗi sản phẩm là một tác phẩm nghệ thuật dành riêng cho không gian sống của bạn.
            </p>

            <div className="space-y-1.5 text-xs font-sans text-espresso-400">
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-gold-600 shrink-0" />
                <span>123 Đường Đồng Khởi, Bến Nghé, Quận 1, TP. HCM</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-gold-600 shrink-0" />
                <span>Hotline: 1900 6868</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-gold-600 shrink-0" />
                <span>support@maisonelegante.vn</span>
              </div>
            </div>
          </div>

          {/* Collections */}
          <div>
            <h4
              className="text-xs font-sans font-bold text-espresso-700 uppercase tracking-widest mb-4"
              style={{ borderBottom: '1px solid rgba(212,175,55,0.3)', paddingBottom: '0.5rem' }}
            >
              Bộ Sưu Tập
            </h4>
            <ul className="space-y-2 text-xs font-sans text-espresso-500">
              {[
                { label: 'Sofa & Ghế Ngồi', slug: 'sofas' },
                { label: 'Đèn Trang Trí', slug: 'lighting' },
                { label: 'Thảm & Rèm Cửa', slug: 'rugs' },
                { label: 'Đồ Nhà Bếp Cao Cấp', slug: 'kitchen' },
                { label: 'Tất cả sản phẩm', slug: '' },
              ].map(({ label, slug }) => (
                <li key={label}>
                  <Link
                    to={slug ? `/products?categorySlug=${slug}` : '/products'}
                    className="hover:text-brand-700 transition-colors flex items-center gap-1"
                  >
                    <span className="text-gold-600 text-[8px]">◆</span>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Policy */}
          <div>
            <h4
              className="text-xs font-sans font-bold text-espresso-700 uppercase tracking-widest mb-4"
              style={{ borderBottom: '1px solid rgba(212,175,55,0.3)', paddingBottom: '0.5rem' }}
            >
              Chính Sách
            </h4>
            <ul className="space-y-2 text-xs font-sans text-espresso-500">
              {[
                'Chính sách bảo hành',
                'Chính sách đổi trả 30 ngày',
                'Giao hàng toàn quốc',
                'Phương thức thanh toán',
                'Bảo mật thông tin',
              ].map((item) => (
                <li key={item}>
                  <span
                    className="hover:text-brand-700 cursor-pointer transition-colors flex items-center gap-1"
                  >
                    <span className="text-gold-600 text-[8px]">◆</span>
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4
              className="text-xs font-sans font-bold text-espresso-700 uppercase tracking-widest mb-4"
              style={{ borderBottom: '1px solid rgba(212,175,55,0.3)', paddingBottom: '0.5rem' }}
            >
              Nhận Ưu Đãi
            </h4>
            <p className="text-xs font-sans text-espresso-400 mb-3 leading-relaxed">
              Nhận voucher <strong className="text-brand-700">200.000₫</strong> & thông tin bộ sưu tập mới nhất.
            </p>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="Email của bạn..."
                className="w-full px-3 py-2 text-xs font-sans rounded-lg focus:outline-none transition-all"
                style={{
                  background: 'rgba(255,255,240,0.9)',
                  border: '1px solid rgba(212,175,55,0.4)',
                  color: '#2C1810',
                }}
              />
              <button
                className="px-3 py-2 rounded-lg text-xs font-sans font-bold shrink-0 text-cream-50 transition-all hover:scale-105"
                style={{
                  background: 'linear-gradient(135deg, #8B0000, #A50000)',
                  border: '1px solid rgba(212,175,55,0.5)',
                }}
              >
                Gửi
              </button>
            </div>
          </div>
        </div>

        {/* ── Footer Bottom ── */}
        <div
          className="mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs font-sans text-espresso-400 gap-4"
          style={{ borderTop: '1px solid rgba(212,175,55,0.2)' }}
        >
          <p>© 2026 Maison Élégante. All rights reserved. Victorian Luxury Home Décor.</p>
          <div className="flex items-center gap-1 text-[11px]">
            <span>Chế tác với</span>
            <Heart className="w-3.5 h-3.5 text-brand-700 fill-brand-700 mx-0.5" />
            <span>React, Node.js & AI Powered</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
