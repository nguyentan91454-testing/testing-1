import { CustomerAvatar } from "../components/CustomerAvatar";
import { Navigate, Link, useLocation } from "react-router-dom";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, api } from "../lib/api";
import { usePageMeta } from "../hooks/usePageMeta";
import { firebaseConfigured, firebaseErrorMessage, signInWithFirebaseGoogle } from "../lib/firebase";
import { AccountSettingsSidebar } from "../components/AccountSettingsSidebar";

export function CustomerAccountPage() {
  usePageMeta("Thông tin cá nhân", "Thông tin tài khoản khách hàng Konyappi Shop.");
  const queryClient = useQueryClient();
  const location = useLocation();
  const customer = useQuery({ queryKey: ["customer"], queryFn: api.customer, retry: false });
  const addresses = useQuery({ queryKey: ["addresses"], queryFn: api.addresses, enabled: Boolean(customer.data) });
  const providers = useQuery({ queryKey: ["auth-providers", customer.data?.id], queryFn: api.authProviders, retry: false, enabled: Boolean(customer.data) });
  const params = new URLSearchParams(location.search);
  const [message, setMessage] = useState(params.get("google_linked") === "success" ? "Đã liên kết Google thành công." : "");
  const [error, setError] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const passwordMutation = useMutation({
    mutationFn: () => {
      if (!providers.data) throw new Error("Vui lòng chờ tải phương thức đăng nhập.");
      const googleOnly = !providers.data?.providers.find((provider) => provider.type === "credentials")?.linked;
      return googleOnly ? api.setPassword(newPassword) : api.changePassword(currentPassword, newPassword);
    },
    onSuccess: () => { setMessage("Đã cập nhật mật khẩu thành công."); setError(""); setCurrentPassword(""); setNewPassword(""); queryClient.invalidateQueries({ queryKey: ["auth-providers"] }); },
    onError: (reason) => { setError(reason instanceof Error ? reason.message : "Không thể cập nhật mật khẩu."); setMessage(""); },
  });
  const unlinkMutation = useMutation({ mutationFn: api.unlinkGoogle, onMutate: () => { setError(""); setMessage(""); }, onSuccess: () => { setMessage("Đã gỡ liên kết Google."); queryClient.invalidateQueries({ queryKey: ["auth-providers"] }); }, onError: (reason) => setError(reason instanceof Error ? reason.message : "Không thể gỡ liên kết Google.") });
  const linkMutation = useMutation({
    mutationFn: async () => api.customerFirebase(await signInWithFirebaseGoogle()),
    onSuccess: ({ isNewAccount: _isNewAccount, ...user }) => { queryClient.setQueryData(["customer"], user); setMessage("Đã liên kết Google thành công."); setError(""); queryClient.invalidateQueries({ queryKey: ["auth-providers"] }); },
    onError: (reason) => setError(reason instanceof ApiError ? reason.message : firebaseErrorMessage(reason)),
  });

  if (customer.isPending) return <main className="wrap account-loading"><LoaderCircle className="spin" size={20}/>Đang tải thông tin tài khoản</main>;
  if (customer.error instanceof ApiError && customer.error.status === 401) return <Navigate to={`/login?next=${encodeURIComponent("/account")}`} replace/>;
  if (customer.isError || !customer.data) return <main className="wrap account-page"><div className="customer-auth-alert" role="alert">{customer.error instanceof Error ? customer.error.message : "Không thể tải thông tin tài khoản."}</div></main>;

  const credentialsLinked = Boolean(providers.data?.providers.find((provider) => provider.type === "credentials")?.linked);
  const googleProvider = providers.data?.providers.find((provider) => provider.type === "google");
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setError(""); setMessage(""); passwordMutation.mutate(); }
  const defaultAddress = addresses.data?.find((address) => address.isDefault) ?? addresses.data?.[0];
  const defaultAddressText = defaultAddress
    ? [defaultAddress.addressDetail, defaultAddress.ward, defaultAddress.district, defaultAddress.province].filter(Boolean).join(", ")
    : [customer.data.addressDetail, customer.data.ward, customer.data.province].filter(Boolean).join(", ");

  return <main className="wrap account-page account-overview-page">
    <div className="address-settings-layout">
      <AccountSettingsSidebar customer={customer.data} active="overview" />
      <section className="address-settings-content account-overview-content">
    <div className="breadcrumbs"><Link to="/">Trang chủ</Link><span>/</span><span>Thông tin cá nhân</span></div>
    <header className="account-heading"><span className="eyebrow">TÀI KHOẢN KHÁCH HÀNG</span><h1>Thông tin cá nhân</h1><p>Quản lý thông tin và phương thức đăng nhập của bạn.</p></header>
    {message && <div className="customer-auth-notice" role="status">{message}</div>}{error && <div className="customer-auth-alert" role="alert">{error}</div>}
    <section className="account-profile" aria-label="Hồ sơ khách hàng"><div className="account-avatar"><CustomerAvatar customerId={customer.data.id} avatarUrl={customer.data.avatarUrl} size={26}/></div><dl><div><dt>Họ và tên</dt><dd>{customer.data.name}</dd></div><div><dt>Email</dt><dd>{customer.data.email}</dd></div><div><dt>Số điện thoại liên hệ</dt><dd>{customer.data.phone || "Chưa bổ sung"}</dd></div><div><dt>Địa chỉ giao hàng mặc định</dt><dd>{defaultAddressText || "Chưa bổ sung"}</dd></div><div><Link to="/account/edit" className="text-link">Chỉnh sửa hồ sơ →</Link></div></dl></section>
    <section className="account-security address-management-card" aria-labelledby="address-management-heading"><div><h2 id="address-management-heading">{"\u0110\u1ecba ch\u1ec9 nh\u1eadn h\u00e0ng"}</h2><p className="account-security-hint">{"L\u01b0u nhi\u1ec1u \u0111\u1ecba ch\u1ec9 nh\u00e0 ri\u00eang, v\u0103n ph\u00f2ng ho\u1eb7c n\u01a1i b\u1ea1n th\u01b0\u1eddng nh\u1eadn h\u00e0ng."}</p></div><Link to="/account/addresses" className="button button-outline">{"Qu\u1ea3n l\u00fd s\u1ed5 \u0111\u1ecba ch\u1ec9"} <ArrowRight size={15}/></Link></section>
    {providers.isPending ? <p role="status">Đang tải phương thức đăng nhập…</p> : providers.isError ? <div className="customer-auth-alert" role="alert">{providers.error.message} <button type="button" className="bare-button" onClick={() => void providers.refetch()}>Thử lại</button></div> : providers.data && <>
      <section className="account-security" aria-labelledby="auth-methods-heading">
        <h2 id="auth-methods-heading">Phương thức đăng nhập</h2>
        <div className="account-provider">
          <p>Email/Mật khẩu: {credentialsLinked ? "✅ Đã liên kết" : "❌ Chưa có"}</p>
          {!credentialsLinked && <a href="#account-password" className="text-link">Đặt mật khẩu</a>}
        </div>
        <div className="account-provider">
          <p>Google: {googleProvider?.linked ? `✅ Đã liên kết (${googleProvider.email})` : "❌ Chưa liên kết"}</p>
          {googleProvider?.linked
            ? <button className="button button-outline" type="button" onClick={() => unlinkMutation.mutate()} disabled={unlinkMutation.isPending || !credentialsLinked}>{unlinkMutation.isPending ? "Đang gỡ…" : "Gỡ liên kết"}</button>
            : <button className="button button-outline" type="button" onClick={() => { setError(""); linkMutation.mutate(); }} disabled={!firebaseConfigured() || linkMutation.isPending}>{linkMutation.isPending ? "Đang mở Google…" : "Liên kết Google"}</button>}
          {!googleProvider?.linked && !firebaseConfigured() && <p className="account-security-hint">Đăng nhập Google chưa sẵn sàng. Hãy cấu hình Firebase Authentication trong file môi trường.</p>}
        </div>
        {!credentialsLinked && <p className="account-security-hint">Bạn cần đặt mật khẩu trước khi gỡ liên kết Google.</p>}
      </section>
      <section className="account-security" id="account-password" aria-labelledby="password-heading">
        <h2 id="password-heading">{credentialsLinked ? "Đổi mật khẩu" : "Đặt mật khẩu"}</h2>
        <form className="customer-auth-form" onSubmit={submit}>
          {credentialsLinked && <label>Mật khẩu hiện tại<input autoComplete="current-password" type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required minLength={1} maxLength={200}/></label>}
          <label>Mật khẩu mới<input autoComplete="new-password" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required minLength={8} maxLength={200}/><small>Tối thiểu 8 ký tự.</small></label>
          {credentialsLinked && <p className="account-security-hint">Các phiên đăng nhập khác sẽ được đăng xuất sau khi đổi mật khẩu.</p>}
          <button className="button button-dark" disabled={passwordMutation.isPending}>{passwordMutation.isPending ? "Đang lưu…" : credentialsLinked ? "Đổi mật khẩu" : "Đặt mật khẩu"}</button>
        </form>
      </section>
    </>}
      </section>
    </div>
  </main>;
}
