import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, ChevronDown, Compass, Lightbulb, LogOut, Menu, PackageSearch, Search, ShoppingBag, UserRound, X } from "lucide-react";
import { api } from "../lib/api";
import { ChatWidget } from "./chat/ChatWidget";

export function StorefrontLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const cartQuery = useQuery({ queryKey: ["cart"], queryFn: api.cart });
  const customer = useQuery({ queryKey: ["customer"], queryFn: api.customer, retry: false });
  const categories = useQuery({ queryKey: ["categories"], queryFn: api.categories });
  const logout = useMutation({ mutationFn: api.customerLogout, onSuccess: () => { setAccountMenuOpen(false); queryClient.setQueryData(["customer"], null); queryClient.invalidateQueries({ queryKey: ["cart"] }); } });
  const cartCount = cartQuery.data?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("auth") === "success") {
      queryClient.invalidateQueries({ queryKey: ["customer"] });
      params.delete("auth");
      navigate({ pathname: location.pathname, search: params.toString() ? `?${params}` : "" }, { replace: true });
    }
  }, [location.pathname, location.search, location.hash, navigate, queryClient]);

  useEffect(() => {
    if (!accountMenuOpen) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!accountMenuRef.current?.contains(event.target as Node)) setAccountMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAccountMenuOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [accountMenuOpen]);

  useEffect(() => setAccountMenuOpen(false), [location.pathname]);

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
          <Link to="/" className="wordmark" aria-label="Konyappi Shop trang chủ"><span className="wordmark-mark">K</span><span>Konyappi Shop<small>LIGHTING & LIVING</small></span></Link>
          <form className="header-search" onSubmit={search} role="search">
            <Search size={18} aria-hidden="true" />
            <input value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Tìm đèn, không gian, phong cách..." aria-label="Tìm sản phẩm" />
            <button type="submit" className="search-submit" aria-label="Tìm kiếm"><ArrowRight size={17} /></button>
          </form>
          <div className="header-actions">
            <Link className="header-text-link" to="/products">Khám phá</Link>
            {customer.data ? <div className="customer-account-menu-wrap" ref={accountMenuRef}><button className="customer-account-link" aria-haspopup="menu" aria-expanded={accountMenuOpen} onClick={() => setAccountMenuOpen((open) => !open)} title="Mở menu tài khoản">{customer.data.avatarUrl ? <img src={customer.data.avatarUrl} alt="" onError={e=>{e.currentTarget.style.display="none";}}/> : <UserRound size={16}/>}<span>{customer.data.name||"Tài khoản"}</span><ChevronDown size={13}/></button>{accountMenuOpen&&<div className="customer-account-menu" role="menu"><Link role="menuitem" to="/account" onClick={()=>setAccountMenuOpen(false)}><UserRound size={16}/><span>Thông tin cá nhân</span></Link><button role="menuitem" type="button" onClick={()=>logout.mutate()} disabled={logout.isPending}><LogOut size={16}/><span>{logout.isPending?"Đang đăng xuất…":"Đăng xuất"}</span></button></div>}</div> : <Link className="customer-account-link" to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} aria-label="Đăng nhập"><UserRound size={17}/><span>Đăng nhập</span></Link>}
            <Link className="bag-link" to="/cart" aria-label={`Giỏ hàng, ${cartCount} sản phẩm`}><ShoppingBag size={21} /><span>Giỏ hàng</span><b>{cartQuery.isLoading ? "–" : cartCount}</b></Link>
          </div>
        </div>
        <nav className={`main-nav ${menuOpen ? "is-open" : ""}`} aria-label="Điều hướng chính">
          <div className="wrap nav-inner">
            <NavLink to="/products" onClick={() => setMenuOpen(false)}>Tất cả sản phẩm</NavLink>
            {(categories.data ?? []).filter((category) => !category.parentId).map((category) => <NavLink key={category.id} to={"/products?category=" + category.slug} onClick={() => setMenuOpen(false)}>{category.name}</NavLink>)}
            <Link to="/#lighting" onClick={() => setMenuOpen(false)}>Tính ánh sáng <span className="nav-new">CÔNG CỤ</span></Link>
            <Link to="/#spaces" className="nav-right" onClick={() => setMenuOpen(false)}>Chọn theo không gian <ArrowRight size={14} /></Link>
          </div>
        </nav>
        <nav className="shortcut-nav wrap" aria-label="Lối tắt">
          <Link to="/products"><PackageSearch size={15} /> Sản phẩm</Link>
          <Link to="/#spaces"><Compass size={15} /> Chọn theo phòng</Link>
          <Link to="/#lighting"><Lightbulb size={15} /> Tính ánh sáng</Link>
          <Link to="/orders/track"><PackageSearch size={15} /> Tra cứu đơn</Link>
        </nav>
      </header>
      <main><Outlet /></main>
      <footer className="site-footer">
        <div className="wrap footer-top">
          <div><Link to="/" className="wordmark footer-wordmark"><span className="wordmark-mark">K</span><span>Konyappi Shop<small>LIGHTING & LIVING</small></span></Link><p>Ánh sáng dịu dàng cho những điều thân thuộc.</p></div>
          <div className="footer-links"><div><strong>Khám phá</strong><Link to="/products">Tất cả sản phẩm</Link><Link to="/#spaces">Theo không gian</Link><Link to="/#lighting">Tính ánh sáng</Link><Link to="/orders/track">Tra cứu đơn hàng</Link></div><div><strong>Thông tin</strong><Link to="/chinh-sach-bao-hanh">Chính sách bảo hành</Link><Link to="/chinh-sach-van-chuyen-cod">Vận chuyển & COD</Link><Link to="/chinh-sach-quyen-rieng-tu">Quyền riêng tư</Link><Link to="/ghi-cong-hinh-anh">Ghi công hình ảnh</Link><Link to="/gioi-thieu-do-an">Giới thiệu đồ án</Link><span>Không nhận thanh toán thật</span></div></div>
        </div>
        <div className="wrap image-credit">Ảnh không gian minh họa từ <a href="https://unsplash.com/license" target="_blank" rel="noreferrer">Unsplash</a>.</div>
        <div className="wrap footer-bottom"><span>© 2026 Konyappi Shop</span><span>Designed for the way home feels.</span></div>
      </footer>
      <ChatWidget />
    </>
  );
}
