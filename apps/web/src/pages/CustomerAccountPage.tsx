import { Navigate, Link } from "react-router-dom";
import { LoaderCircle, UserRound } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { ApiError, api } from "../lib/api";
import { usePageMeta } from "../hooks/usePageMeta";

export function CustomerAccountPage() {
  usePageMeta("Thông tin cá nhân", "Thông tin tài khoản khách hàng Konyappi Shop.");
  const customer = useQuery({ queryKey: ["customer"], queryFn: api.customer, retry: false });

  if (customer.isPending) return <main className="wrap account-loading"><LoaderCircle className="spin" size={20}/>Đang tải thông tin tài khoản</main>;
  if (customer.error instanceof ApiError && customer.error.status === 401) {
    return <Navigate to={`/login?next=${encodeURIComponent("/account")}`} replace/>;
  }

  return <main className="wrap account-page">
    <div className="breadcrumbs"><Link to="/">Trang chủ</Link><span>/</span><span>Thông tin cá nhân</span></div>
    <header className="account-heading"><span className="eyebrow">TÀI KHOẢN KHÁCH HÀNG</span><h1>Thông tin cá nhân</h1><p>Thông tin đang được lưu cho tài khoản của bạn.</p></header>
    {customer.isError ? <div className="customer-auth-alert" role="alert">{customer.error instanceof Error ? customer.error.message : "Không thể tải thông tin tài khoản."}</div> : customer.data && <section className="account-profile" aria-label="Hồ sơ khách hàng">
      <div className="account-avatar">{customer.data.avatarUrl ? <img src={customer.data.avatarUrl} alt=""/> : <UserRound size={26}/>}</div>
      <dl><div><dt>Họ và tên</dt><dd>{customer.data.name}</dd></div><div><dt>Email</dt><dd>{customer.data.email}</dd></div></dl>
    </section>}
  </main>;
}
