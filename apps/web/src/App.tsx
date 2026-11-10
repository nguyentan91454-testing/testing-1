import { lazy, Suspense } from "react";
import { useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { StorefrontLayout } from "./components/StorefrontLayout";
import { GlobalErrorBoundary } from "./components/GlobalErrorBoundary";

const HomePage = lazy(() => import("./pages/HomePage").then((module) => ({ default: module.HomePage })));
const ProductsPage = lazy(() => import("./pages/ProductsPage").then((module) => ({ default: module.ProductsPage })));
const ProductPage = lazy(() => import("./pages/ProductPage").then((module) => ({ default: module.ProductPage })));
const CartPage = lazy(() => import("./pages/CartPage").then((module) => ({ default: module.CartPage })));
const CheckoutPage = lazy(() => import("./pages/CheckoutPage").then((module) => ({ default: module.CheckoutPage })));
const PrivacyPage = lazy(() => import("./pages/PrivacyPage").then((module) => ({ default: module.PrivacyPage })));
const TrackOrderPage = lazy(() => import("./pages/TrackOrderPage").then((module) => ({ default: module.TrackOrderPage })));
const InformationPage = lazy(() => import("./pages/InformationPage").then((module) => ({ default: module.InformationPage })));
const AdminPage = lazy(() => import("./pages/admin/AdminPage").then((module) => ({ default: module.AdminPage })));

function RouteLoading() { return <div className="wrap route-loading" role="status">Đang mở trang...</div>; }
function NotFoundPage() { return <div className="wrap error-page"><span className="eyebrow">404 · KHÔNG TÌM THẤY</span><h1>Trang này không có ở đây.</h1><a href="/" className="button button-dark">Về trang chủ</a></div>; }

function HashScrollManager() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (!hash) return;

    const targetId = decodeURIComponent(hash.slice(1));
    let frame = 0;
    const scrollToTarget = () => {
      const target = document.getElementById(targetId);
      if (!target) return false;
      frame = requestAnimationFrame(() => target.scrollIntoView({ behavior: "smooth", block: "start" }));
      return true;
    };

    if (scrollToTarget()) return () => cancelAnimationFrame(frame);

    const observer = new MutationObserver(() => {
      if (scrollToTarget()) {
        observer.disconnect();
        window.clearTimeout(timeout);
      }
    });
    const timeout = window.setTimeout(() => observer.disconnect(), 5000);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      window.clearTimeout(timeout);
      cancelAnimationFrame(frame);
    };
  }, [pathname, hash]);

  return null;
}

export default function App() {
  return <GlobalErrorBoundary><HashScrollManager/><Suspense fallback={<RouteLoading/>}><Routes><Route path="/admin/login" element={<AdminPage loginOnly/>}/><Route path="/admin/*" element={<AdminPage/>}/><Route element={<StorefrontLayout/>}><Route index element={<HomePage/>}/><Route path="products" element={<ProductsPage/>}/><Route path="products/:slug" element={<ProductPage/>}/><Route path="cart" element={<CartPage/>}/><Route path="checkout" element={<CheckoutPage/>}/><Route path="orders/track" element={<TrackOrderPage/>}/><Route path="chinh-sach-quyen-rieng-tu" element={<PrivacyPage/>}/><Route path="chinh-sach-bao-hanh" element={<InformationPage kind="warranty"/>}/><Route path="chinh-sach-van-chuyen-cod" element={<InformationPage kind="shipping"/>}/><Route path="ghi-cong-hinh-anh" element={<InformationPage kind="credits"/>}/><Route path="gioi-thieu-do-an" element={<InformationPage kind="about"/>}/><Route path="*" element={<NotFoundPage/>}/></Route></Routes></Suspense></GlobalErrorBoundary>;
}
