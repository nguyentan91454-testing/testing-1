import { ArrowRight, Check, Edit3, LoaderCircle, MapPin, Plus, Star, Trash2, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, api, type CustomerAddress } from "../lib/api";
import { usePageMeta } from "../hooks/usePageMeta";
import { AccountSettingsSidebar } from "../components/AccountSettingsSidebar";
import { useVietnamLocations, withCurrentOption } from "../components/VietnamLocationSelects";

type AddressDraft = {
  label: string;
  recipientName: string;
  phone: string;
  province: string;
  district: string;
  ward: string;
  addressDetail: string;
  isDefault: boolean;
};

const emptyDraft = (name = "", phone = "", isDefault = false): AddressDraft => ({ label: "", recipientName: name, phone, province: "", district: "", ward: "", addressDetail: "", isDefault });

export function CustomerAddressesPage() {
  usePageMeta("Địa chỉ nhận hàng", "Quản lý sổ địa chỉ nhận hàng của bạn.");
  const queryClient = useQueryClient();
  const customer = useQuery({ queryKey: ["customer"], queryFn: api.customer, retry: false });
  const addresses = useQuery({ queryKey: ["addresses"], queryFn: api.addresses, enabled: Boolean(customer.data) });
  const [editing, setEditing] = useState<CustomerAddress | null>(null);
  const [draft, setDraft] = useState<AddressDraft | null>(null);
  const [pendingDelete, setPendingDelete] = useState<CustomerAddress | null>(null);
  const [error, setError] = useState("");
  const { locations, isLoading: locationsLoading, error: locationsError } = useVietnamLocations();

  const save = useMutation({
    mutationFn: () => {
      if (!draft) throw new Error("Hãy nhập thông tin địa chỉ.");
      const payload = { ...draft, label: draft.label.trim() || null };
      return editing ? api.updateAddress(editing.id, payload) : api.createAddress(payload);
    },
    onSuccess: () => { setDraft(null); setEditing(null); setError(""); queryClient.invalidateQueries({ queryKey: ["addresses"] }); },
    onError: (reason) => setError(reason instanceof Error ? reason.message : "Không thể lưu địa chỉ."),
  });
  const setDefault = useMutation({
    mutationFn: (id: string) => api.setDefaultAddress(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["addresses"] }),
    onError: (reason) => setError(reason instanceof Error ? reason.message : "Không thể đặt địa chỉ mặc định."),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.deleteAddress(id),
    onSuccess: (value) => { queryClient.setQueryData(["addresses"], value); setError(""); },
    onError: (reason) => setError(reason instanceof Error ? reason.message : "Không thể xóa địa chỉ."),
  });

  if (customer.isPending || addresses.isPending) return <main className="wrap account-loading"><LoaderCircle className="spin" size={20}/>Đang tải sổ địa chỉ</main>;
  if (customer.error instanceof ApiError && customer.error.status === 401) return <Navigate to={`/login?next=${encodeURIComponent("/account/addresses")}`} replace/>;
  if (customer.isError || !customer.data) return <main className="wrap account-page"><div className="customer-auth-alert" role="alert">Không thể tải thông tin tài khoản.</div></main>;
  if (addresses.isError) return <main className="wrap account-page"><div className="customer-auth-alert" role="alert">{addresses.error.message}</div></main>;

  function startCreate() {
    setEditing(null);
    setDraft(emptyDraft(customer.data!.name, customer.data!.phone ?? "", !addresses.data?.length));
    setError("");
  }
  function startEdit(address: CustomerAddress) {
    setEditing(address);
    setDraft({ label: address.label ?? "", recipientName: address.recipientName, phone: address.phone, province: address.province, district: address.district, ward: address.ward, addressDetail: address.addressDetail, isDefault: address.isDefault });
    setError("");
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) return;
    const missing = draft.province ? (!draft.district ? "Hãy chọn quận / huyện thuộc tỉnh đã chọn." : !draft.ward ? "Hãy chọn phường / xã thuộc huyện đã chọn." : !draft.addressDetail.trim() ? "Hãy nhập địa chỉ chi tiết để người giao hàng tìm được nơi nhận." : "") : "Hãy chọn tỉnh / thành phố trước.";
    if (missing) { setError(missing); return; }
    setError("");
    save.mutate();
  }
  function confirmDelete() {
    if (!pendingDelete) return;
    remove.mutate(pendingDelete.id, { onSettled: () => setPendingDelete(null) });
  }
  function updateDraft(values: Partial<AddressDraft>) { setDraft((current) => current ? { ...current, ...values } : current); }
  const selectedProvince = locations.find((province) => province.name === draft?.province);
  const selectedDistrict = selectedProvince?.districts.find((district) => district.name === draft?.district);
  const provinceNames = withCurrentOption(locations.map((province) => province.name), draft?.province ?? "");
  const districtNames = withCurrentOption(selectedProvince?.districts.map((district) => district.name) ?? [], draft?.district ?? "");
  const wardNames = withCurrentOption(selectedDistrict?.wards.map((ward) => ward.name) ?? [], draft?.ward ?? "");

  return <main className="wrap account-page addresses-page">
    <div className="address-settings-layout">
      <AccountSettingsSidebar customer={customer.data} active="addresses" />
      <section className="address-settings-content">
    <div className="breadcrumbs"><Link to="/account">Tài khoản</Link><span>/</span><span>Địa chỉ nhận hàng</span></div>
    <header className="account-heading addresses-heading"><div><span className="eyebrow">SỔ ĐỊA CHỈ</span><h1>Địa chỉ nhận hàng</h1><p>Lưu tối đa 10 địa chỉ để chọn nhanh khi đặt hàng.</p></div><button type="button" className="button button-dark" onClick={startCreate} disabled={addresses.data.length >= 10}><Plus size={16}/>Thêm địa chỉ</button></header>
    {(error || locationsError) && <div className="customer-auth-alert" role="alert">{error || locationsError}</div>}
    <div className="address-book">
      {addresses.data.length === 0 && !draft && <div className="address-empty"><MapPin size={25}/><h2>Chưa có địa chỉ nào</h2><p>Thêm địa chỉ nhà riêng, văn phòng hoặc nơi bạn thường nhận hàng.</p><button type="button" className="button button-dark" onClick={startCreate}><Plus size={16}/>Thêm địa chỉ đầu tiên</button></div>}
      {addresses.data.map((address) => <article className={`address-card${address.isDefault ? " is-default" : ""}`} key={address.id}>
        <div className="address-card-top"><div className="address-card-title"><MapPin size={17}/><strong>{address.label || "Địa chỉ nhận hàng"}</strong>{address.isDefault && <span className="address-default-badge"><Star size={11}/>Mặc định</span>}</div><div className="address-card-actions"><button type="button" className="bare-button" onClick={() => startEdit(address)}><Edit3 size={14}/>Sửa</button><button type="button" className="bare-button address-delete" disabled={remove.isPending} onClick={() => setPendingDelete(address)}><Trash2 size={14}/>Xóa</button></div></div>
        <div className="address-recipient"><strong>{address.recipientName}</strong><span>{address.phone}</span></div>
        <p>{[address.addressDetail, address.ward, address.district, address.province].filter(Boolean).join(", ")}</p>
        {!address.isDefault && <button type="button" className="button button-outline address-set-default" disabled={setDefault.isPending} onClick={() => setDefault.mutate(address.id)}><Check size={14}/>Đặt làm mặc định</button>}
      </article>)}
    </div>
    {draft && <div className="address-editor" role="dialog" aria-modal="true" aria-labelledby="address-editor-title"><div className="address-editor-head"><div><span className="eyebrow">{editing ? "CHỈNH SỬA" : "ĐỊA CHỈ MỚI"}</span><h2 id="address-editor-title">{editing ? "Chỉnh sửa địa chỉ" : "Thêm địa chỉ nhận hàng"}</h2></div><button type="button" className="bare-button" aria-label="Đóng" onClick={() => { setDraft(null); setEditing(null); }}><X size={19}/></button></div><form onSubmit={submit} className="address-form" noValidate>
      <div className="address-form-grid"><AddressField label="Nhãn địa chỉ (không bắt buộc)"><input value={draft.label} maxLength={40} placeholder="Nhà riêng, Văn phòng..." onChange={(event) => setDraft({ ...draft, label: event.target.value })}/></AddressField><AddressField label="Tên người nhận"><input required minLength={2} maxLength={120} value={draft.recipientName} onChange={(event) => setDraft({ ...draft, recipientName: event.target.value })}/></AddressField><AddressField label="Số điện thoại"><input required minLength={9} maxLength={24} value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })}/></AddressField><AddressField label="Tỉnh / thành phố"><select required value={draft.province} disabled={locationsLoading} onChange={(event) => updateDraft({ province: event.target.value, district: "", ward: "" })}><option value="">{locationsLoading ? "Đang tải tỉnh thành…" : "Chọn tỉnh / thành phố"}</option>{provinceNames.map((name) => <option key={name} value={name}>{name}</option>)}</select></AddressField><AddressField label="Quận / huyện"><select required value={draft.district} disabled={!draft.province || locationsLoading} onChange={(event) => updateDraft({ district: event.target.value, ward: "" })}><option value="">{draft.province ? "Chọn quận / huyện" : "Chọn tỉnh trước"}</option>{districtNames.map((name) => <option key={name} value={name}>{name}</option>)}</select></AddressField><AddressField label="Phường / xã"><select required value={draft.ward} disabled={!draft.district || locationsLoading} onChange={(event) => updateDraft({ ward: event.target.value })}><option value="">{draft.district ? "Chọn phường / xã" : "Chọn huyện trước"}</option>{wardNames.map((name) => <option key={name} value={name}>{name}</option>)}</select></AddressField><AddressField label="Địa chỉ chi tiết" wide><input required minLength={5} maxLength={500} placeholder="Số nhà, tên đường, tòa nhà..." value={draft.addressDetail} onChange={(event) => setDraft({ ...draft, addressDetail: event.target.value })}/></AddressField></div>
      {error && <p className="address-form-error" role="alert">{error}</p>}<label className="address-default-toggle"><input type="checkbox" checked={draft.isDefault} onChange={(event) => setDraft({ ...draft, isDefault: event.target.checked })}/><span>Đặt làm địa chỉ mặc định</span></label>
      <div className="address-editor-actions"><button type="button" className="button button-outline" onClick={() => { setDraft(null); setEditing(null); }}>Hủy</button><button type="submit" className="button button-dark" disabled={save.isPending || locationsLoading || Boolean(locationsError)}>{save.isPending ? "Đang lưu..." : "Lưu địa chỉ"}<ArrowRight size={15}/></button></div>
    </form></div>}
    {pendingDelete && <div className="address-delete-backdrop" role="presentation"><div className="address-delete-dialog" role="alertdialog" aria-modal="true" aria-labelledby="address-delete-title"><div className="address-delete-dialog-icon"><Trash2 size={20}/></div><h2 id="address-delete-title">Xóa địa chỉ này?</h2><p>Địa chỉ <strong>{pendingDelete.label || pendingDelete.recipientName}</strong> sẽ bị xóa khỏi sổ địa chỉ. Đơn hàng đã đặt không bị ảnh hưởng.</p><div className="address-delete-dialog-actions"><button type="button" className="button button-outline" onClick={() => setPendingDelete(null)} disabled={remove.isPending}>Giữ lại</button><button type="button" className="button address-delete-confirm" onClick={confirmDelete} disabled={remove.isPending}>{remove.isPending ? "Đang xóa…" : "Xóa địa chỉ"}</button></div></div></div>}
      </section>
    </div>
  </main>;
}

function AddressField({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return <label className={`form-field address-field${wide ? " wide-field" : ""}`}><span>{label}</span>{children}</label>;
}
