import { Link } from "react-router-dom";
import { ArrowUpRight, ShoppingBag } from "lucide-react";
import { formatVnd } from "../lib/format";
import type { Product } from "../types";

export function ProductCard({ product, onAdd }: { product: Product; onAdd?: (variantId: string) => void }) {
  const variant = product.variants[0];
  const image = product.images[0];
  const wasPrice = variant?.compareAtPriceVnd && variant.compareAtPriceVnd > variant.priceVnd ? variant.compareAtPriceVnd : null;
  return (
    <article className="product-card">
      <Link className="product-image" to={`/products/${product.slug}`} aria-label={`Xem ${product.name}`}>
        {image ? <img src={image.url} alt={image.alt ?? product.name} loading="lazy" /> : <div className="image-missing"><span>Ảnh minh họa<br />đang được cập nhật</span></div>}
        <span className="product-kind">{product.categories?.[0]?.category.name ?? "ĐÈN TRANG TRÍ"}</span>
        <span className="product-open"><ArrowUpRight size={18} /></span>
      </Link>
      <div className="product-info">
        <Link to={`/products/${product.slug}`} className="product-name">{product.name}</Link>
        <div className="product-card-bottom"><div><strong>{formatVnd(variant?.priceVnd ?? product.minPriceVnd)}</strong>{wasPrice && <del>{formatVnd(wasPrice)}</del>}</div>
          <button type="button" className="quick-add" disabled={!variant || variant.stockQty < 1} onClick={() => variant && onAdd?.(variant.id)} aria-label={`Thêm ${product.name} vào giỏ`}><ShoppingBag size={17} /></button>
        </div>
        {variant && <span className={`stock-note ${variant.stockQty < 1 ? "out" : ""}`}>{variant.stockQty < 1 ? "Tạm hết hàng" : variant.stockQty <= 3 ? `Còn ${variant.stockQty} sản phẩm` : "Sẵn sàng cho tổ ấm"}</span>}
      </div>
    </article>
  );
}
