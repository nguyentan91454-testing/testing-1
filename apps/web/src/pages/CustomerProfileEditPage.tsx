import { CustomerAvatar } from "../components/CustomerAvatar";
import { AvatarEditor } from "../components/AvatarEditor";
import { AvatarRemovalConfirmation } from "../components/AvatarRemovalConfirmation";
import { useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Camera, LoaderCircle, LockKeyhole, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { ApiError, api, type Customer } from "../lib/api";
import { profileFormSchema, profileFormValues, type ProfileFormValues } from "../lib/customer-profile";
import { usePageMeta } from "../hooks/usePageMeta";
import { avatarFileError } from "../lib/avatar-crop";

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
  const [avatarError, setAvatarError] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [confirmAvatarRemoval, setConfirmAvatarRemoval] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
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
  const upload = useMutation({
    mutationFn: (file: File) => api.uploadAvatar(file),
    onSuccess: (user) => {
      // Uploads share one endpoint: use a fresh image URL even for consecutive edits.
      const updated = { ...user, avatarUrl: user.avatarUrl ? `${user.avatarUrl}?v=${Date.now()}` : null };
      queryClient.setQueryData(["customer"], updated);
      setAvatarFile(null);
      setAvatarError("");
      setSaved(true);
    },
  });
  const remove = useMutation({
    mutationFn: api.removeAvatar,
    onSuccess: (user) => { queryClient.setQueryData(["customer"], user); setConfirmAvatarRemoval(false); setAvatarError(""); setSaved(true); },
  });
  function chooseAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    editAvatar(file);
  }
  function editAvatar(file: File) {
    const error = avatarFileError(file);
    upload.reset();
    remove.reset();
    if (error) { setAvatarError(error); setSaved(false); return; }
    setAvatarError("");
    setSaved(false);
    setAvatarFile(file);
  }
  const errors = form.formState.errors;
  return <div className="wrap account-page profile-edit-page">
    <div className="breadcrumbs"><Link to="/">Trang chủ</Link><span>/</span><Link to="/account">Tài khoản</Link><span>/</span><span>Chỉnh sửa hồ sơ</span></div>
    <header className="account-heading"><span className="eyebrow">{welcome ? "CHÀO MỪNG ĐẾN KONYAPPI SHOP" : "HỒ SƠ CỦA BẠN"}</span><h1>{welcome ? "Rất vui được gặp bạn." : "Chỉnh sửa hồ sơ"}</h1><p>{welcome ? "Tài khoản đã sẵn sàng. Bạn có thể bổ sung thông tin ngay hoặc bỏ qua để mua sắm." : "Cập nhật thông tin để lần đặt hàng sau thuận tiện hơn."}</p></header>
    <form className="profile-edit-form" onSubmit={form.handleSubmit((values) => { setSaved(false); save.mutate(values); })} noValidate>
      <div className="profile-identity"><button type="button" className="account-avatar profile-avatar-trigger" aria-label="Thay đổi ảnh đại diện" disabled={upload.isPending || remove.isPending} onClick={() => fileInput.current?.click()}><CustomerAvatar customerId={customer.id} avatarUrl={customer.avatarUrl} size={34}/></button><div><strong>{customer.name}</strong><p><LockKeyhole size={13}/>Email được quản lý bởi tài khoản đăng nhập.</p><div className="avatar-actions"><input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={chooseAvatar}/><button type="button" className="button button-outline" disabled={upload.isPending || remove.isPending} onClick={() => fileInput.current?.click()}><Camera size={14}/>{upload.isPending ? "Đang tải ảnh…" : "Đổi ảnh đại diện"}</button>{customer.avatarUrl && <button type="button" className="bare-button avatar-remove" disabled={upload.isPending || remove.isPending} onClick={() => { setSaved(false); setAvatarError(""); remove.reset(); setConfirmAvatarRemoval(true); }}><Trash2 size={14}/>Xóa ảnh</button>}</div><p className="avatar-upload-hint">Chọn ảnh rồi kéo, thu phóng hoặc xoay trước khi lưu.</p>{avatarError && <small className="field-error" role="alert">{avatarError}</small>}{upload.isError && !avatarFile && <small className="field-error" role="alert">{upload.error.message}</small>}{remove.isError && <small className="field-error" role="alert">{remove.error.message}</small>}</div></div>
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
    {avatarFile && <AvatarEditor file={avatarFile} name={customer.name} onChoose={editAvatar} onApply={(file) => upload.mutateAsync(file)} onCancel={() => { setAvatarFile(null); upload.reset(); }}/>}
    {confirmAvatarRemoval && <AvatarRemovalConfirmation busy={remove.isPending} onCancel={() => setConfirmAvatarRemoval(false)} onConfirm={() => remove.mutate()}/>}
  </div>;
}

function ProfileField({ label, error, wide, children }: { label: string; error?: string | undefined; wide?: boolean; children: ReactNode }) {
  return <label className={"form-field" + (wide ? " wide-field" : "")}><span>{label}</span>{children}{error && <small className="field-error" role="alert">{error}</small>}</label>;
}
