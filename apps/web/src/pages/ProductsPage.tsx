import { useMemo, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { ProductGrid } from "../components/ProductGrid";
import { usePageMeta } from "../hooks/usePageMeta";

export function ProductsPage() {
  usePageMeta("Đèn và đồ trang trí", "Tìm đèn theo phòng, phong cách, danh mục và khoảng giá.");
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchText, setSearchText] = useState(searchParams.get("q") ?? "");
  const paramsKey = searchParams.toString();
  const products = useQuery({ queryKey: ["products", paramsKey], queryFn: () => api.catalog(new URLSearchParams(paramsKey)) });
  const categories = useQuery({ queryKey: ["categories"], queryFn: api.categories });
  const spaces = useQuery({ queryKey: ["spaces"], queryFn: api.spaces });
  const styles = useQuery({ queryKey: ["styles"], queryFn: api.styles });
  const activeCount = useMemo(() => ["q", "category", "space", "style", "minPrice", "maxPrice", "minLumens", "maxLumens", "socket"].filter((key) => searchParams.has(key)).length, [paramsKey]);

  function update(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    setSearchParams(next);
  }
  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    update("q", searchText.trim());
  }
  function clearFilters() {
    setSearchParams(searchParams.get("q") ? { q: searchParams.get("q")! } : {});
    setSearchText(searchParams.get("q") ?? "");
  }

  return (
    <div className="catalog-page wrap">
      <div className="breadcrumbs"><a href="/">Trang chủ</a><span>/</span><span>Đèn & trang trí</span></div>
      <div className="catalog-title-row"><div><span className="eyebrow">BỘ SƯU TẬP NHÀ MÌNH</span><h1>{searchParams.get("q") ? `Kết quả cho “${searchParams.get("q")}”` : "Đèn & đồ trang trí"}</h1><p>Thiết kế có chủ đích, thông số sáng rõ, dễ chọn cho căn nhà của bạn.</p></div><span className="catalog-count">{products.data?.meta?.total ?? products.data?.data.length ?? 0} sản phẩm</span></div>
      <div className="catalog-toolbar"><form className="catalog-search" onSubmit={submitSearch}><Search size={17} /><input value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Tìm sản phẩm..." aria-label="Tìm sản phẩm"/>{searchText && <button type="button" className="bare-button" onClick={() => { setSearchText(""); update("q", ""); }} aria-label="Xóa từ khóa"><X size={16}/></button>}<button type="submit" className="button button-dark">Tìm</button></form><label className="sort-select">Sắp xếp<select value={searchParams.get("sort") ?? "newest"} onChange={(event) => update("sort", event.target.value)}><option value="newest">Mới nhất</option><option value="price_asc">Giá thấp đến cao</option><option value="price_desc">Giá cao đến thấp</option></select></label></div>
      <div className="catalog-layout">
        <aside className="filter-panel"><div className="filter-title"><strong><SlidersHorizontal size={16}/> Lọc sản phẩm</strong>{activeCount > 0 && <button className="bare-button" onClick={clearFilters}>Xóa lọc</button>}</div>
          <FilterGroup title="Danh mục">{categories.data?.map((item) => <FilterOption key={item.id} label={item.name} value={item.slug} current={searchParams.get("category")} onSelect={(value) => update("category", value)}/>)}</FilterGroup>
          <FilterGroup title="Không gian">{spaces.data?.map((item) => <FilterOption key={item.id} label={item.name} value={item.slug} current={searchParams.get("space")} onSelect={(value) => update("space", value)}/>)}</FilterGroup>
          <FilterGroup title="Phong cách">{styles.data?.map((item) => <FilterOption key={item.id} label={item.name} value={item.slug} current={searchParams.get("style")} onSelect={(value) => update("style", value)}/>)}</FilterGroup>
          <FilterGroup title="Khoảng giá"><div className="price-range"><label>Từ<input type="number" min="0" step="100000" placeholder="0 đ" value={searchParams.get("minPrice") ?? ""} onChange={(event) => update("minPrice", event.target.value)}/></label><label>Đến<input type="number" min="0" step="100000" placeholder="Không giới hạn" value={searchParams.get("maxPrice") ?? ""} onChange={(event) => update("maxPrice", event.target.value)}/></label></div></FilterGroup>
          <FilterGroup title="Thông số kỹ thuật"><div className="price-range"><label>Lumen từ<input type="number" min="0" step="100" placeholder="Ví dụ 800" value={searchParams.get("minLumens") ?? ""} onChange={(event) => update("minLumens", event.target.value)}/></label><label>Đến<input type="number" min="0" step="100" placeholder="Không giới hạn" value={searchParams.get("maxLumens") ?? ""} onChange={(event) => update("maxLumens", event.target.value)}/></label></div><label className="technical-filter-label">Loại đui<select value={searchParams.get("socket")??""} onChange={event=>update("socket",event.target.value)}><option value="">Tất cả loại đui</option><option value="E27">E27</option><option value="E14">E14</option><option value="GU10">GU10</option></select></label></FilterGroup>
        </aside>
        <section className="catalog-results" aria-live="polite">{products.isLoading ? <div className="product-grid">{[0,1,2,3].map((item) => <div className="product-skeleton" key={item}><span/><i/><i/></div>)}</div> : products.isError ? <div className="api-state">{products.error.message}</div> : <><ProductGrid products={products.data?.data ?? []}/>{(products.data?.meta?.totalPages??1)>1&&<nav className="catalog-pagination" aria-label="Phân trang"><button disabled={(products.data?.meta?.page??1)<=1} onClick={()=>update("page",String((products.data?.meta?.page??1)-1))}><ChevronLeft size={16}/> Trước</button><span>Trang {products.data?.meta?.page} / {products.data?.meta?.totalPages}</span><button disabled={(products.data?.meta?.page??1)>=(products.data?.meta?.totalPages??1)} onClick={()=>update("page",String((products.data?.meta?.page??1)+1))}>Tiếp <ChevronRight size={16}/></button></nav>}</>}</section>
      </div>
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="filter-group"><h3>{title}</h3><div>{children}</div></section>;
}
function FilterOption({ label, value, current, onSelect }: { label: string; value: string; current: string | null; onSelect: (value: string) => void }) {
  const selected = value === current;
  return <button type="button" className={`filter-option ${selected ? "selected" : ""}`} onClick={() => onSelect(selected ? "" : value)} aria-pressed={selected}><span>{label}</span><i/></button>;
}
