import { CustomerAvatar } from "../components/CustomerAvatar";
import { useState, type ReactNode } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, LoaderCircle, LockKeyhole } from "lucide-react";
import { useForm } from "react-hook-form";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { ApiError, api, type Customer } from "../lib/api";
import { profileFormSchema, profileFormValues, type ProfileFormValues } from "../lib/customer-profile";
import { usePageMeta } from "../hooks/usePageMeta";

export function CustomerProfileEditPage() {
  usePageMeta("Chỉnh sửa hồ sơ", "Lưu thông tin liên hệ và địa chỉ giao hàng mặc định.");
  const customer = useQuery({ queryKey: ["customer"], queryFn: api.customer, retry: false });
  const [params] = useSearchParams();
  const welcome = params.get("welcome") === "true";
  if (customer.isPending) return <div className="wrap account-loading" role="status"><LoaderCircle className="spin" size={20}/>Đang tải hồ sơ…</div>;
  if (customer.error instanceof ApiError && customer.error.status === 401) {
    return <Navigate to={"/login?next=" + encodeURIComponent("/account/edit" + (welcome ? "?welcome=true" : ""))} replace/>;
  }
  if (customer.isError || !customer.data) return <div className="wrap account-page"><p className="customer-auth-alert" role="alert">{customer.error?.message ?? "Không thể tải hồ sơ."}</p><button className="button button-outline" onClick={() => void customer.refetch()}>Thử lại</button></div>;
  return <ProfileForm key={customer.data.id} customer={customer.data} welcome={welcome}/>;
}

function ProfileForm({ customer, welcome }: { customer: Customer; welcome: boolean }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [saved, setSaved] = useState(false);
  const form = useForm<ProfileFormValues>({ resolver: zodResolver(profileFormSchema), defaultValues: profileFormValues(customer) });
  const save = useMutation({
    mutationFn: (values: ProfileFormValues) => api.updateProfile({
      name: values.name, phone: values.phone || null, province: values.province || null,
      ward: values.ward || null, addressDetail: values.addressDetail || null,
    }),
    onSuccess: (user) => {
      queryClient.setQueryData(["customer"], user);
      form.reset(profileFormValues(user));
      setSaved(true);
      if (welcome) navigate("/", { replace: true });
    },
  });
  const errors = form.formState.errors;
  return <div className="wrap account-page profile-edit-page">
    <div className="breadcrumbs"><Link to="/">Trang chủ</Link><span>/</span><Link to="/account">Tài khoản</Link><span>/</span><span>Chỉnh sửa hồ sơ</span></div>
    <header className="account-heading"><span className="eyebrow">{welcome ? "CHÀO MỪNG ĐẾN KONYAPPI SHOP" : "HỒ SƠ CỦA BẠN"}</span><h1>{welcome ? "Rất vui được gặp bạn." : "Chỉnh sửa hồ sơ"}</h1><p>{welcome ? "Tài khoản đã sẵn sàng. Bạn có thể bổ sung thông tin ngay hoặc bỏ qua để mua sắm." : "Cập nhật thông tin để lần đặt hàng sau thuận tiện hơn."}</p></header>
    <form className="profile-edit-form" onSubmit={form.handleSubmit((values) => { setSaved(false); save.mutate(values); })} noValidate>
      <div className="profile-identity"><div className="account-avatar"><CustomerAvatar customerId={customer.id} avatarUrl={customer.avatarUrl} size={26}/></div><div><strong>{customer.name}</strong><p><LockKeyhole size={13}/>Email được quản lý bởi tài khoản đăng nhập.</p></div></div>
      <p className="profile-hint">Chỉ họ tên là bắt buộc. Số điện thoại và địa chỉ có thể bổ sung khi đặt hàng; bạn có thể dùng thông tin của người nhận khác.</p>
      <fieldset disabled={save.isPending} className="profile-fields">
        <div className="form-grid">
          <ProfileField label="Họ và tên *" error={errors.name?.message}><input autoComplete="name" maxLength={120} aria-invalid={Boolean(errors.name)} {...form.register("name")}/></ProfileField>
          <ProfileField label="Email"><input type="email" value={customer.email} readOnly aria-readonly="true"/></ProfileField>
          <ProfileField label="Số điện thoại (tùy chọn)" error={errors.phone?.message}><input type="tel" autoComplete="tel" maxLength={24} placeholder="09xx xxx xxx" aria-invalid={Boolean(errors.phone)} {...form.register("phone")}/></ProfileField>
          <ProfileField label="Tỉnh / thành phố (tùy chọn)" error={errors.province?.message}><input autoComplete="address-level1" maxLength={100} aria-invalid={Boolean(errors.province)} {...form.register("province")}/></ProfileField>
          <ProfileField label="Phường / xã (tùy chọn)" error={errors.ward?.message}><input autoComplete="address-level2" maxLength={100} aria-invalid={Boolean(errors.ward)} {...form.register("ward")}/></ProfileField>
          <ProfileField label="Địa chỉ chi tiết (tùy chọn)" error={errors.addressDetail?.message} wide><input autoComplete="street-address" maxLength={500} placeholder="Số nhà, tên đường…" aria-invalid={Boolean(errors.addressDetail)} {...form.register("addressDetail")}/></ProfileField>
        </div>
      </fieldset>
      {save.isError && <p className="customer-auth-alert" role="alert">{save.error.message}</p>}
      {saved && <p className="customer-auth-notice" role="status">Đã lưu thông tin hồ sơ.</p>}
      <div className="profile-actions"><button className="button button-dark" disabled={save.isPending}>{save.isPending ? "Đang lưu…" : "Lưu thông tin"}<ArrowRight size={16}/></button><Link to={welcome ? "/" : "/account"} className="text-link">{welcome ? "Bỏ qua, mua sắm ngay →" : "Quay lại tài khoản"}</Link></div>
    </form>
  </div>;
}

function ProfileField({ label, error, wide, children }: { label: string; error?: string | undefined; wide?: boolean; children: ReactNode }) {
  return <label className={"form-field" + (wide ? " wide-field" : "")}><span>{label}</span>{children}{error && <small className="field-error" role="alert">{error}</small>}</label>;
}
