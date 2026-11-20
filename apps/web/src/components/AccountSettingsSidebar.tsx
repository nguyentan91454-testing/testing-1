import { Edit3, ShoppingBag, Tag, UserRound, WalletCards } from "lucide-react";
import { Link } from "react-router-dom";
import { CustomerAvatar } from "./CustomerAvatar";
import type { Customer } from "../lib/api";

export function AccountSettingsSidebar({ customer, active }: { customer: Customer; active: "overview" | "profile" | "addresses" }) {
  return <aside className="address-settings-sidebar" aria-label="Cài đặt tài khoản">
    <div className="settings-user"><div className="settings-avatar"><CustomerAvatar customerId={customer.id} avatarUrl={customer.avatarUrl} size={42}/></div><div><strong>{customer.name}</strong><Link to="/account/edit"><Edit3 size={12}/>Chỉnh sửa hồ sơ</Link></div></div>
    <nav className="settings-nav">
      <Link to="/account" className={active === "overview" ? "is-active" : ""}><UserRound size={17}/>Tài khoản của tôi</Link>
      <Link to="/account/edit" className={`settings-sub-link${active === "profile" ? " is-active" : ""}`}>Hồ sơ</Link>
      <Link to="/account/addresses" className={`settings-sub-link${active === "addresses" ? " is-active" : ""}`}>Địa chỉ</Link>
      <Link to="/account" className="settings-sub-link">Thông báo</Link>
      <Link to="/account"><ShoppingBag size={17}/>Đơn mua</Link>
      <Link to="/account"><Tag size={17}/>Kho voucher</Link>
      <Link to="/account"><WalletCards size={17}/>Shopee Coins</Link>
    </nav>
  </aside>;
}
