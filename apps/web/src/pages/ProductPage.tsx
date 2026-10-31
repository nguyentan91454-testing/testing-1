import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, PackageCheck, Ruler, ShieldCheck } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { formatVnd } from "../lib/format";
import { usePageMeta } from "../hooks/usePageMeta";

export function ProductPage() {
  const { slug = "" } = useParams();
  usePageMeta(queryTitle(slug), "Thông tin thiết kế, phiên bản và thông số của sản phẩm Nhà Mình.");
  const [variantIndex, setVariantIndex] = useState(0);
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["product", slug], queryFn: () => api.product(slug) });
  const add = useMutation({ mutationFn: (variantId: string) => api.addCartItem(variantId, 1), onSuccess: (cart) => queryClient.setQueryData(["cart"], cart) });
  if (query.isLoading) return <div className="wrap page-pending"><div className="product-skeleton detail-skeleton"/><span>Đang tải thông tin sản phẩm...</span></div>;
  if (query.isError || !query.data) return <div className="wrap error-page"><span className="eyebrow">KHÔNG TÌM THẤY SẢN PHẨM</span><h1>Mẫu đèn này chưa sẵn sàng.</h1><p>{query.error?.message ?? "Sản phẩm có thể đã được cập nhật hoặc tạm ẩn."}</p><Link to="/products" className="button button-dark">Quay lại bộ sưu tập <ArrowRight size={16}/></Link></div>;

  const product = query.data;
  const variant = product.variants[variantIndex] ?? product.variants[0];
  const image = product.images[0];
  const optionNames = variant?.options?.map(({ value }) => `${value.optionType.name}: ${value.name}`).join(" · ");
  return <div className="wrap product-page">
    <div className="breadcrumbs"><Link to="/">Trang chủ</Link><span>/</span><Link to="/products">Đèn & trang trí</Link><span>/</span><span>{product.name}</span></div>
    <div className="product-detail-layout"><div className="detail-image">{image ? <img src={image.url} alt={image.alt ?? product.name}/> : <div className="image-missing large"><span>Ảnh minh họa<br/>đang được cập nhật</span></div>}<span className="demo-image-label">ẢNH MINH HỌA</span></div>
      <section className="product-detail-info"><span className="eyebrow">{product.brand?.name ?? product.categories?.[0]?.category.name ?? "NHÀ MÌNH SELECTED"}</span><h1>{product.name}</h1><div className="detail-price">{formatVnd(variant?.priceVnd ?? product.minPriceVnd)}{variant?.compareAtPriceVnd && variant.compareAtPriceVnd > variant.priceVnd && <del>{formatVnd(variant.compareAtPriceVnd)}</del>}</div><p className="detail-description">{product.description ?? "Một thiết kế ánh sáng được lựa chọn cho nhịp sống và không gian của bạn."}</p>
        {product.variants.length > 1 && <div className="variant-picker"><span>Chọn phiên bản</span><div>{product.variants.map((item, index) => <button type="button" className={index === variantIndex ? "selected" : ""} key={item.id} onClick={() => setVariantIndex(index)}>{item.options?.map(({ value }) => value.name).join(" · ") || item.sku}</button>)}</div></div>}
        {optionNames && <p className="selected-option"><Check size={15}/>{optionNames}</p>}
        <div className="stock-status"><span className={variant?.stockQty ? "stock-dot" : "stock-dot empty"}/>{variant?.stockQty ? `Còn ${variant.stockQty} sản phẩm trong kho demo` : "Phiên bản này tạm hết hàng"}</div>
        <button className="button button-dark add-detail" disabled={!variant || variant.stockQty < 1 || add.isPending} onClick={() => variant && add.mutate(variant.id)}>{add.isPending ? "Đang thêm..." : add.isSuccess ? "Đã thêm vào giỏ" : "Thêm vào giỏ"}<ArrowRight size={17}/></button>
        {add.isError && <p className="inline-error">{add.error.message}</p>}
        <div className="detail-assurances"><div><PackageCheck/><span><strong>Vận chuyển mô phỏng</strong><small>Phí giao hàng xác nhận ở checkout</small></span></div><div><ShieldCheck/><span><strong>Bảo hành 12 tháng</strong><small>Cho phần điện của đèn</small></span></div><div><Ruler/><span><strong>Thông số minh bạch</strong><small>Thông tin từ dữ liệu catalog</small></span></div></div>
        <Link to="/products" className="back-link"><ArrowLeft size={15}/> Tiếp tục xem sản phẩm</Link>
      </section>
    </div>
    <section className="spec-section"><div><span className="eyebrow">THÔNG TIN SẢN PHẨM</span><h2>Chi tiết làm nên khác biệt.</h2></div><dl>{product.attributes?.map((item) => <div key={item.attribute.key}><dt>{item.attribute.label}</dt><dd>{String(item.value)}{item.attribute.unit ? ` ${item.attribute.unit}` : ""}</dd></div>)}{product.categories?.length ? <div><dt>Danh mục</dt><dd>{product.categories.map((item) => item.category.name).join(", ")}</dd></div> : null}{product.spaces?.length ? <div><dt>Không gian phù hợp</dt><dd>{product.spaces.map((item) => item.space.name).join(", ")}</dd></div> : null}</dl></section>
  </div>;
}

function queryTitle(slug: string) { return slug ? slug.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) : "Sản phẩm"; }
