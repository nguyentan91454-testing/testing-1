import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ShoppingBasket } from "lucide-react";
import { api } from "../lib/api";
import type { Product } from "../types";
import { ProductCard } from "./ProductCard";

export function ProductGrid({ products }: { products: Product[] }) {
  const queryClient = useQueryClient();
  const addMutation = useMutation({
    mutationFn: (variantId: string) => api.addCartItem(variantId, 1),
    onSuccess: (cart) => queryClient.setQueryData(["cart"], cart),
  });
  if (products.length === 0) return <div className="empty-products"><span className="empty-icon"><ShoppingBasket /></span><strong>Chưa tìm thấy sản phẩm phù hợp</strong><span>Thử đổi bộ lọc hoặc xem tất cả sản phẩm.</span></div>;
  return <div className="product-grid">{products.map((product) => <ProductCard key={product.id} product={product} onAdd={(variantId) => addMutation.mutate(variantId)} />)}</div>;
}
