import { Role, OrderStatus, PaymentStatus, PaymentMethod, DiscountType, ProductStatus, ChatSender } from '../constants';

// ================= API RESPONSE ENVELOPE =================
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Record<string, string[]> | string;
  code?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

// ================= USER & AUTH TYPES =================
export interface UserDto {
  id: string;
  email: string;
  fullName: string;
  phone?: string | null;
  avatarUrl?: string | null;
  role: Role;
  isActive: boolean;
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  expiresIn: number;
}

export interface AuthResponse {
  user: UserDto;
  accessToken: string;
}

export interface AddressDto {
  id: string;
  recipientName: string;
  phone: string;
  street: string;
  ward: string;
  district: string;
  city: string;
  isDefault: boolean;
}

// ================= PRODUCT TYPES =================
export interface CategoryDto {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  parentId?: string | null;
  _count?: {
    products: number;
  };
}

export interface BrandDto {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  logoUrl?: string | null;
  _count?: {
    products: number;
  };
}

export interface ProductImageDto {
  id: string;
  url: string;
  altText?: string | null;
  isPrimary: boolean;
  sortOrder: number;
}

export interface ProductVariantDto {
  id: string;
  sku: string;
  name: string;
  price: number;
  salePrice?: number | null;
  stock: number;
  attributes: Record<string, string>;
  imageUrl?: string | null;
}

export interface ProductDto {
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription?: string | null;
  price: number;
  salePrice?: number | null;
  status: ProductStatus;
  isFeatured: boolean;
  rating: number;
  reviewCount: number;
  stock: number;
  specifications: Record<string, string>;
  category: CategoryDto;
  brand: BrandDto;
  images: ProductImageDto[];
  variants: ProductVariantDto[];
  createdAt: string;
  updatedAt: string;
}

// ================= CART TYPES =================
export interface CartItemDto {
  id: string;
  productId: string;
  variantId?: string | null;
  product: ProductDto;
  variant?: ProductVariantDto | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface CartDto {
  id: string;
  items: CartItemDto[];
  subtotal: number;
  discountAmount: number;
  shippingFee: number;
  total: number;
  appliedCoupon?: CouponDto | null;
  itemCount: number;
}

// ================= COUPON TYPES =================
export interface CouponDto {
  id: string;
  code: string;
  description?: string | null;
  discountType: DiscountType;
  discountValue: number;
  minOrderValue: number;
  maxDiscountAmount?: number | null;
  usageLimit?: number | null;
  usageCount: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

// ================= ORDER TYPES =================
export interface OrderItemDto {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  productImage: string;
  variantId?: string | null;
  variantName?: string | null;
  price: number;
  quantity: number;
  total: number;
}

export interface PaymentDto {
  id: string;
  orderId: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  transactionId?: string | null;
  paymentDetails?: any;
  paidAt?: string | null;
}

export interface OrderDto {
  id: string;
  orderCode: string;
  userId: string;
  user?: {
    fullName: string;
    email: string;
    phone?: string | null;
  };
  status: OrderStatus;
  subtotal: number;
  discountAmount: number;
  shippingFee: number;
  totalAmount: number;
  shippingAddress: AddressDto;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  payment?: PaymentDto | null;
  couponCode?: string | null;
  customerNote?: string | null;
  items: OrderItemDto[];
  createdAt: string;
  updatedAt: string;
}

// ================= REVIEW TYPES =================
export interface ReviewDto {
  id: string;
  productId: string;
  userId: string;
  user: {
    fullName: string;
    avatarUrl?: string | null;
  };
  rating: number;
  comment: string;
  images: string[];
  isVerifiedPurchase?: boolean;
  createdAt: string;
}

// ================= CHATBOT TYPES =================
export interface ProductRecommendation {
  id: string;
  name: string;
  slug: string;
  price: number;
  salePrice?: number | null;
  rating: number;
  imageUrl: string;
  category: string;
  brand: string;
  stock: number;
  reason?: string;
}

export interface ChatMessageDto {
  id: string;
  role: ChatSender;
  content: string;
  toolCalls?: Array<{
    name: string;
    arguments: any;
    result?: any;
  }>;
  recommendedProducts?: ProductRecommendation[];
  createdAt: string;
}

export interface ChatConversationDto {
  id: string;
  title?: string | null;
  messages: ChatMessageDto[];
  createdAt: string;
  updatedAt: string;
}

// ================= ADMIN ANALYTICS TYPES =================
export interface AdminDashboardStats {
  totalRevenue: number;
  revenueGrowthPercent: number;
  totalOrders: number;
  orderGrowthPercent: number;
  totalCustomers: number;
  customerGrowthPercent: number;
  totalProducts: number;
  lowStockProductsCount: number;
  recentOrders: OrderDto[];
  topSellingProducts: Array<{
    id: string;
    name: string;
    slug: string;
    imageUrl: string;
    price: number;
    totalSold: number;
    revenue: number;
  }>;
  revenueTrends: Array<{
    date: string;
    revenue: number;
    orders: number;
  }>;
  ordersByStatus: Array<{
    status: OrderStatus;
    count: number;
    percentage: number;
  }>;
  lowStockProducts: Array<{
    id: string;
    name: string;
    stock: number;
  }>;
}
