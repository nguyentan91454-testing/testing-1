export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
  meta?: { page: number; limit: number; total: number; totalPages: number };
}

export interface TaxonomyItem {
  id: string;
  slug: string;
  name: string;
  imageUrl?: string | null;
  sortOrder: number;
}

export interface ProductImage {
  id: string;
  url: string;
  alt?: string | null;
}

export interface ProductVariant {
  id: string;
  sku: string;
  priceVnd: number;
  compareAtPriceVnd?: number | null;
  stockQty: number;
  options?: Array<{ value: { name: string; optionType: { name: string } } }>;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  minPriceVnd: number;
  images: ProductImage[];
  variants: ProductVariant[];
  categories?: Array<{ category: TaxonomyItem }>;
  brand?: { name: string } | null;
  attributes?: Array<{ attribute: { key: string; label: string; unit: string | null }; value: unknown }>;
  spaces?: Array<{ space: TaxonomyItem }>;
  styles?: Array<{ style: TaxonomyItem }>;
}

export interface CheckoutResult {
  id: string;
  code: string;
  totalVnd: number;
  paymentStatus: string;
  orderStatus: string;
  codAmountVnd: number;
  depositRequiredVnd: number;
  payment: { id: string; type: string; amountVnd: number; provider: "MOCK"; qr: { mode: "DEMO"; payload: string; imageUrl: string } } | null;
  trackingToken: string;
  trackingExpiresAt: string;
  isDemo: true;
}

export interface CartItem {
  id: string;
  variantId: string;
  sku: string;
  productName: string;
  image: ProductImage | null;
  quantity: number;
  unitPriceVnd: number;
  lineTotalVnd: number;
  availableStock: number;
  isAvailable: boolean;
}

export interface Cart {
  coupon: { code: string; discountVnd: number; requiresCheckoutValidation: boolean } | null;
  items: CartItem[];
  price: {
    subtotalVnd: number;
    discountVnd: number;
    shippingFeeGrossVnd: number;
    shippingSubsidyVnd: number;
    shippingFeeCustomerVnd: number;
    totalVnd: number;
  };
}

export interface LightingResult {
  roomType: string;
  areaM2: number;
  ceilingHeightM: number;
  lumenPerM2: number;
  recommendedLumens: number;
  acceptedLumens: { min: number; max: number };
  products: Array<{ productId: string; slug: string; name: string; variantId: string; sku: string; priceVnd: number; stockQty: number; lumens: number }>;
  bundles: Array<{ id: string; slug: string; name: string; discountVnd: number; totalLumens: number }>;
}
