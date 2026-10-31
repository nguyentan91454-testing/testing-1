import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowRight, MoveUpRight } from "lucide-react";
import { api } from "../lib/api";
import { ProductGrid } from "../components/ProductGrid";
import { LightingCalculator } from "../components/LightingCalculator";
import { usePageMeta } from "../hooks/usePageMeta";

const roomScenes = [
  { slug: "phong-khach", name: "Phòng khách", note: "Nơi mọi người cùng trở về", image: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=900&q=82", className: "room-wide" },
  { slug: "ban-an", name: "Bàn ăn", note: "Bữa cơm thêm ấm áp", image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=700&q=82", className: "" },
  { slug: "phong-ngu", name: "Phòng ngủ", note: "Một khoảng nghỉ dịu dàng", image: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=700&q=82", className: "" },
];
const styles = [
  { slug: "bac-au", name: "Bắc Âu", image: "https://images.unsplash.com/photo-1600210492493-0946911123ea?auto=format&fit=crop&w=800&q=82" },
  { slug: "hien-dai", name: "Hiện đại", image: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=800&q=82" },
  { slug: "indochine", name: "Indochine", image: "https://images.unsplash.com/photo-1616486029423-aaa4789e8c9a?auto=format&fit=crop&w=800&q=82" },
];

export function HomePage() {
  usePageMeta("Ánh sáng cho không gian sống", "Khám phá đèn theo không gian, phong cách và nhu cầu chiếu sáng của căn nhà.");
  const products = useQuery({ queryKey: ["products", "home"], queryFn: () => api.products(new URLSearchParams({ limit: "4", sort: "newest" })) });
  const spaces = useQuery({ queryKey: ["spaces"], queryFn: api.spaces });
  const catalogError = products.error;

  return (
    <>
      <section className="hero" aria-label="Bộ sưu tập ánh sáng Nhà Mình">
        <img className="hero-image" src="https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=2200&q=88" alt="Phòng khách sáng thoáng với ánh sáng dịu và chất liệu gỗ tự nhiên" fetchPriority="high" />
        <div className="hero-shade" />
        <div className="wrap hero-content"><span className="hero-kicker"><i /> CHỌN ÁNH SÁNG CHO TỔ ẤM</span><h1>Ánh sáng dịu,<br />nhà mình vui.</h1><p>Những thiết kế đèn được chọn theo không gian, chiều cao trần và nhịp sống của bạn.</p><div className="hero-actions"><Link to="/products" className="button button-lime">Khám phá bộ sưu tập <ArrowRight size={17} /></Link><a href="#spaces" className="hero-secondary">Tìm theo không gian <ArrowDown size={15} /></a></div></div>
        <div className="hero-caption"><span>01 / 03</span><span>Ánh sáng trong không gian sống</span><span className="caption-line" /></div>
        <span className="demo-stamp">ẢNH MINH HỌA · ĐỒ ÁN DEMO</span>
      </section>

      <section className="benefit-row wrap" aria-label="Cam kết trải nghiệm"><div><span className="benefit-number">01</span><p><strong>Chọn đúng công năng</strong><small>Ánh sáng hợp với từng căn phòng</small></p></div><div><span className="benefit-number">02</span><p><strong>Thông số rõ ràng</strong><small>Lumen, kích thước và chất liệu</small></p></div><div><span className="benefit-number">03</span><p><strong>Tư vấn có căn cứ</strong><small>Dữ liệu sản phẩm từ hệ thống</small></p></div></section>

      <section className="section wrap" id="spaces">
        <div className="section-heading"><div><span className="eyebrow">BẮT ĐẦU TỪ CĂN PHÒNG</span><h2>Mỗi nơi, một sắc sáng.</h2></div><Link to="/products" className="text-link">Xem tất cả sản phẩm <ArrowRight size={16} /></Link></div>
        <div className="room-grid">{roomScenes.map((room, index) => <Link key={room.slug} className={`room-tile ${room.className}`} to={`/products?space=${room.slug}`}><img src={room.image} alt={`Không gian ${room.name} với ánh sáng trang trí`} loading="lazy"/><span className="room-index">0{index + 1}</span><div className="room-overlay"><div><strong>{room.name}</strong><small>{room.note}</small></div><MoveUpRight size={19} /></div><span className="demo-image-label">ẢNH MINH HỌA</span></Link>)}</div>
        {(spaces.data?.length ?? 0) > 3 && <div className="more-taxonomy">{spaces.data?.filter((space) => !roomScenes.some((room) => room.slug === space.slug)).map((space) => <Link key={space.id} to={`/products?space=${space.slug}`}>{space.name}<ArrowRight size={14} /></Link>)}</div>}
      </section>

      <section className="style-band"><div className="wrap"><div className="section-heading"><div><span className="eyebrow">TỪ CHẤT LIỆU ĐẾN CẢM XÚC</span><h2>Phong cách bạn gọi là nhà.</h2></div><Link to="/products" className="text-link">Khám phá phong cách <ArrowRight size={16} /></Link></div><div className="style-grid">{styles.map((style) => <Link className="style-tile" to={`/products?style=${style.slug}`} key={style.slug}><img src={style.image} alt={`Nội thất phong cách ${style.name}`} loading="lazy"/><span>{style.name}</span><ArrowRight size={18} /></Link>)}</div></div></section>

      <section className="section wrap featured-section"><div className="section-heading"><div><span className="eyebrow">NHỮNG THIẾT KẾ ĐƯỢC CHỌN</span><h2>Đèn dành cho mỗi ngày.</h2></div><Link to="/products" className="text-link">Tất cả sản phẩm <ArrowRight size={16} /></Link></div>{products.isLoading ? <div className="product-grid">{[0,1,2,3].map((item) => <div className="product-skeleton" key={item}><span/><i/><i/></div>)}</div> : catalogError ? <p className="api-state">{catalogError instanceof Error ? catalogError.message : "Chưa kết nối được danh mục."}</p> : <ProductGrid products={products.data ?? []} />}</section>

      <section className="lighting-band" id="lighting"><div className="wrap"><LightingCalculator /></div></section>
      <section className="closing-note wrap"><span className="closing-mark">n.</span><p>Nhà mình không cần hoàn hảo.<br /><strong>Chỉ cần đúng với mình.</strong></p><Link to="/products" className="button button-outline">Tìm chiếc đèn của bạn <ArrowRight size={16} /></Link></section>
    </>
  );
}
