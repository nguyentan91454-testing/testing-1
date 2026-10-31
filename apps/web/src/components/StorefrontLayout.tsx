import { useState, type FormEvent } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Menu, Search, ShoppingBag, X } from "lucide-react";
import { api } from "../lib/api";
import { ChatWidget } from "./chat/ChatWidget";

export function StorefrontLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const navigate = useNavigate();
  const cartQuery = useQuery({ queryKey: ["cart"], queryFn: api.cart });
  const cartCount = cartQuery.data?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (searchText.trim()) params.set("q", searchText.trim());
    navigate(`/products${params.size ? `?${params}` : ""}`);
    setMenuOpen(false);
  }

  return (
    <>
      <div className="demo-strip"><span>KHÔNG GIAN SỐNG, CHỌN ÁNH SÁNG THẬT ĐÚNG</span><span className="demo-strip-note">Website đồ án · Mọi đơn hàng và thanh toán đều mô phỏng</span></div>
      <header className="site-header">
        <div className="header-main wrap">
          <button className="icon-button mobile-menu-trigger" aria-label={menuOpen ? "Đóng menu" : "Mở menu"} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button>
          <Link to="/" className="wordmark" aria-label="Nhà Mình trang chủ"><span className="wordmark-mark">n.</span><span>nhà mình<small>LIGHTING & LIVING</small></span></Link>
          <form className="header-search" onSubmit={search} role="search">
            <Search size={18} aria-hidden="true" />
            <input value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Tìm đèn, không gian, phong cách..." aria-label="Tìm sản phẩm" />
            <button type="submit" className="search-submit" aria-label="Tìm kiếm"><ArrowRight size={17} /></button>
          </form>
          <div className="header-actions">
            <Link className="header-text-link" to="/products">Khám phá</Link>
            <Link className="bag-link" to="/cart" aria-label={`Giỏ hàng, ${cartCount} sản phẩm`}><ShoppingBag size={21} /><span>Giỏ hàng</span><b>{cartQuery.isLoading ? "–" : cartCount}</b></Link>
          </div>
        </div>
        <nav className={`main-nav ${menuOpen ? "is-open" : ""}`} aria-label="Điều hướng chính">
          <div className="wrap nav-inner">
            <NavLink to="/products?space=phong-khach" onClick={() => setMenuOpen(false)}>Phòng khách</NavLink>
            <NavLink to="/products?space=ban-an" onClick={() => setMenuOpen(false)}>Bàn ăn</NavLink>
            <NavLink to="/products?space=phong-ngu" onClick={() => setMenuOpen(false)}>Phòng ngủ</NavLink>
            <NavLink to="/products?style=bac-au" onClick={() => setMenuOpen(false)}>Bắc Âu</NavLink>
            <NavLink to="/products?style=indochine" onClick={() => setMenuOpen(false)}>Indochine</NavLink>
            <a href="/#lighting" onClick={() => setMenuOpen(false)}>Tính ánh sáng <span className="nav-new">CÔNG CỤ</span></a>
            <a href="/#spaces" className="nav-right" onClick={() => setMenuOpen(false)}>Chọn theo không gian <ArrowRight size={14} /></a>
          </div>
        </nav>
      </header>
      <main><Outlet /></main>
      <footer className="site-footer">
        <div className="wrap footer-top">
          <div><Link to="/" className="wordmark footer-wordmark"><span className="wordmark-mark">n.</span><span>nhà mình<small>LIGHTING & LIVING</small></span></Link><p>Ánh sáng dịu dàng cho những điều thân thuộc.</p></div>
          <div className="footer-links"><div><strong>Khám phá</strong><Link to="/products">Tất cả sản phẩm</Link><a href="/#spaces">Theo không gian</a><a href="/#lighting">Tính ánh sáng</a></div><div><strong>Thông tin</strong><span>Đồ án tốt nghiệp · dữ liệu minh họa</span><span>Không nhận thanh toán thật</span></div></div>
        </div>
        <div className="wrap image-credit">Ảnh không gian minh họa từ <a href="https://unsplash.com/license" target="_blank" rel="noreferrer">Unsplash</a>.</div>
        <div className="wrap footer-bottom"><span>© 2026 Nhà Mình</span><span>Designed for the way home feels.</span></div>
      </footer>
      <ChatWidget />
    </>
  );
}
