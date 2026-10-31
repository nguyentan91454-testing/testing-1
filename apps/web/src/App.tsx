import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { StorefrontLayout } from "./components/StorefrontLayout";
import { GlobalErrorBoundary } from "./components/GlobalErrorBoundary";

const HomePage = lazy(() => import("./pages/HomePage").then((module) => ({ default: module.HomePage })));
const ProductsPage = lazy(() => import("./pages/ProductsPage").then((module) => ({ default: module.ProductsPage })));
const ProductPage = lazy(() => import("./pages/ProductPage").then((module) => ({ default: module.ProductPage })));
const CartPage = lazy(() => import("./pages/CartPage").then((module) => ({ default: module.CartPage })));
const CheckoutPage = lazy(() => import("./pages/CheckoutPage").then((module) => ({ default: module.CheckoutPage })));
const PrivacyPage = lazy(() => import("./pages/PrivacyPage").then((module) => ({ default: module.PrivacyPage })));

function RouteLoading() { return <div className="wrap route-loading" role="status">Đang mở trang...</div>; }
function NotFoundPage() { return <div className="wrap error-page"><span className="eyebrow">404 · KHÔNG TÌM THẤY</span><h1>Trang này không có ở đây.</h1><a href="/" className="button button-dark">Về trang chủ</a></div>; }

export default function App() {
  return <GlobalErrorBoundary><Suspense fallback={<RouteLoading/>}><Routes><Route element={<StorefrontLayout/>}><Route index element={<HomePage/>}/><Route path="products" element={<ProductsPage/>}/><Route path="products/:slug" element={<ProductPage/>}/><Route path="cart" element={<CartPage/>}/><Route path="checkout" element={<CheckoutPage/>}/><Route path="chinh-sach-quyen-rieng-tu" element={<PrivacyPage/>}/><Route path="*" element={<NotFoundPage/>}/></Route></Routes></Suspense></GlobalErrorBoundary>;
}
