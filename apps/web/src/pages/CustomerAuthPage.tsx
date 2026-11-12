import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, LoaderCircle, ShieldCheck } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

export function CustomerAuthPage({ mode }: { mode: "login" | "register" }) {
  const isRegister = mode === "register";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const customer = useQuery({ queryKey: ["customer"], queryFn: api.customer, retry: false });
  const auth = useMutation({
    mutationFn: () => isRegister ? api.customerRegister({ name, email, password }) : api.customerLogin({ email, password }),
    onSuccess: (user) => {
      queryClient.setQueryData(["customer"], user);
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      const destination = new URLSearchParams(location.search).get("next");
      navigate(destination?.startsWith("/") ? destination : "/", { replace: true });
    },
    onError: (reason) => setError(reason instanceof Error ? reason.message : "Không thể đăng nhập. Vui lòng thử lại."),
  });

  if (customer.data) return <Navigate to="/" replace />;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    auth.mutate();
  }

  const cancelled = new URLSearchParams(location.search).get("auth_error") === "cancelled";
  return <main className="customer-auth-page"><section className="customer-auth-panel">
    <Link to="/" className="customer-auth-brand"><span className="wordmark-mark">K</span><span>Konyappi Shop<small>LIGHTING & LIVING</small></span></Link>
    <span className="eyebrow">TÀI KHOẢN KHÁCH HÀNG</span>
    <h1>{isRegister ? "Tạo tài khoản" : "Đăng nhập"}</h1>
    <p className="customer-auth-lead">{isRegister ? "Tạo tài khoản để lưu thông tin và theo dõi trải nghiệm mua sắm." : "Đăng nhập để tiếp tục trải nghiệm mua sắm của bạn."}</p>
    {cancelled && <div className="customer-auth-alert" role="status">Bạn đã hủy đăng nhập Google.</div>}
    {error && <div className="customer-auth-alert" role="alert">{error}</div>}
    <form className="customer-auth-form" onSubmit={submit}>
      {isRegister && <label>Họ và tên<input autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={120} required /></label>}
      <label>Email<input autoComplete="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} required /></label>
      <label>Mật khẩu<input autoComplete={isRegister ? "new-password" : "current-password"} type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} maxLength={200} required /><small>{isRegister ? "Tối thiểu 8 ký tự" : ""}</small></label>
      <button className="button button-dark full-button" disabled={auth.isPending}>{auth.isPending && <LoaderCircle className="spin" size={17}/>}<span>{isRegister ? "Đăng ký" : "Đăng nhập"}</span><ArrowRight size={17}/></button>
    </form>
    <div className="customer-auth-divider"><span>hoặc tiếp tục với</span></div>
    <a className="customer-google-button" href="/api/v1/auth/google"><GoogleMark/><span>Google</span></a>
    <p className="customer-auth-switch">{isRegister ? "Đã có tài khoản?" : "Chưa có tài khoản?"} <Link to={isRegister ? "/login" : "/register"}>{isRegister ? "Đăng nhập" : "Đăng ký"}</Link></p>
    <p className="customer-auth-security"><ShieldCheck size={15}/> Phiên đăng nhập được bảo vệ bằng cookie bảo mật.</p>
  </section></main>;
}

function GoogleMark() {
  return <svg aria-hidden="true" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.91c-.58 2.96-2.26 5.48-4.73 7.18l7.66 5.95c4.47-4.13 7.14-10.2 7.14-17.6Z"/><path fill="#FBBC05" d="M10.53 28.59A14.5 14.5 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.2A23.9 23.9 0 0 0 0 24c0 3.88.93 7.57 2.56 10.78l7.97-6.19Z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.66-5.95c-2.13 1.43-4.86 2.28-8.25 2.28-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.2C6.51 42.62 14.62 48 24 48Z"/></svg>;
}
