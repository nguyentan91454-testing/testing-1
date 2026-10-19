import { z } from 'zod';
import { PaymentMethod, ProductStatus, DiscountType, OrderStatus, Role } from '../constants';

// ================= AUTH SCHEMAS =================
export const RegisterSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z
    .string()
    .min(6, 'Mật khẩu phải có ít nhất 6 ký tự')
    .max(100, 'Mật khẩu không được quá 100 ký tự'),
  fullName: z.string().min(2, 'Họ tên phải có ít nhất 2 ký tự').max(100),
  phone: z.string().regex(/^(0|\+84)[3|5|7|8|9][0-9]{8}$/, 'Số điện thoại không hợp lệ').optional().or(z.literal('')),
});

export const LoginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(1, 'Token không hợp lệ'),
  newPassword: z.string().min(6, 'Mật khẩu mới phải có ít nhất 6 ký tự'),
});

export const UpdateProfileSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  phone: z.string().regex(/^(0|\+84)[3|5|7|8|9][0-9]{8}$/, 'Số điện thoại không hợp lệ').optional().or(z.literal('')),
  avatarUrl: z.string().url('URL ảnh đại diện không hợp lệ').optional().or(z.literal('')),
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại'),
  newPassword: z.string().min(6, 'Mật khẩu mới phải có ít nhất 6 ký tự'),
});

// ================= ADDRESS SCHEMAS =================
export const AddressSchema = z.object({
  recipientName: z.string().min(2, 'Tên người nhận phải có ít nhất 2 ký tự'),
  phone: z.string().regex(/^(0|\+84)[3|5|7|8|9][0-9]{8}$/, 'Số điện thoại không hợp lệ'),
  street: z.string().min(3, 'Địa chỉ đường/phố phải có ít nhất 3 ký tự'),
  ward: z.string().min(1, 'Vui lòng nhập Phường/Xã'),
  district: z.string().min(1, 'Vui lòng nhập Quận/Huyện'),
  city: z.string().min(1, 'Vui lòng nhập Tỉnh/Thành phố'),
  isDefault: z.boolean().default(false).optional(),
});

// ================= PRODUCT SCHEMAS =================
export const ProductQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(12),
  search: z.string().optional(),
  categoryId: z.string().optional(),
  categorySlug: z.string().optional(),
  brandId: z.string().optional(),
  brandSlug: z.string().optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().positive().optional(),
  rating: z.coerce.number().min(1).max(5).optional(),
  inStock: z.enum(['true', 'false']).transform((val) => val === 'true').optional(),
  sort: z.enum(['price_asc', 'price_desc', 'newest', 'top_rated', 'popular']).default('newest'),
  isFeatured: z.enum(['true', 'false']).transform((val) => val === 'true').optional(),
});

export const ProductVariantCreateSchema = z.object({
  sku: z.string().min(2),
  name: z.string().min(1),
  price: z.number().nonnegative(),
  salePrice: z.number().nonnegative().optional().nullable(),
  stock: z.number().int().nonnegative().default(0),
  attributes: z.record(z.string(), z.string()).optional(),
  imageUrl: z.string().url().optional().nullable(),
});

export const ProductCreateSchema = z.object({
  name: z.string().min(3, 'Tên sản phẩm phải có ít nhất 3 ký tự'),
  slug: z.string().min(3).optional(),
  description: z.string().min(10, 'Mô tả phải có ít nhất 10 ký tự'),
  shortDescription: z.string().optional(),
  price: z.number().positive('Giá phải lớn hơn 0'),
  salePrice: z.number().nonnegative().optional().nullable(),
  categoryId: z.string().min(1, 'Vui lòng chọn danh mục'),
  brandId: z.string().min(1, 'Vui lòng chọn thương hiệu'),
  status: z.nativeEnum(ProductStatus).default(ProductStatus.ACTIVE),
  isFeatured: z.boolean().default(false),
  specifications: z.record(z.string(), z.string()).optional(),
  images: z.array(z.string().url()).min(1, 'Cần ít nhất 1 ảnh sản phẩm'),
  variants: z.array(ProductVariantCreateSchema).optional(),
  stock: z.number().int().nonnegative().default(10),
});

export const ProductUpdateSchema = ProductCreateSchema.partial();

// ================= CATEGORY & BRAND SCHEMAS =================
export const CategoryCreateSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).optional(),
  description: z.string().optional(),
  imageUrl: z.string().url().optional().nullable(),
  parentId: z.string().optional().nullable(),
});

export const BrandCreateSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).optional(),
  description: z.string().optional(),
  logoUrl: z.string().url().optional().nullable(),
});

// ================= CART SCHEMAS =================
export const AddToCartSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().optional().nullable(),
  quantity: z.number().int().positive('Số lượng phải lớn hơn 0').default(1),
});

export const UpdateCartItemSchema = z.object({
  quantity: z.number().int().positive('Số lượng phải lớn hơn 0'),
});

// ================= COUPON SCHEMAS =================
export const ApplyCouponSchema = z.object({
  code: z.string().min(2, 'Mã giảm giá không hợp lệ').toUpperCase(),
});

export const CouponCreateSchema = z.object({
  code: z.string().min(2).toUpperCase(),
  description: z.string().optional(),
  discountType: z.nativeEnum(DiscountType),
  discountValue: z.number().positive(),
  minOrderValue: z.number().nonnegative().default(0),
  maxDiscountAmount: z.number().positive().optional().nullable(),
  usageLimit: z.number().int().positive().optional().nullable(),
  startDate: z.string().datetime().or(z.date()),
  endDate: z.string().datetime().or(z.date()),
  isActive: z.boolean().default(true),
});

// ================= ORDER SCHEMAS =================
export const CreateOrderSchema = z.object({
  shippingAddress: AddressSchema,
  paymentMethod: z.nativeEnum(PaymentMethod).default(PaymentMethod.COD),
  couponCode: z.string().optional().nullable(),
  customerNote: z.string().max(500).optional(),
  items: z.array(
    z.object({
      productId: z.string().min(1),
      variantId: z.string().optional().nullable(),
      quantity: z.number().int().positive(),
    })
  ).min(1, 'Đơn hàng phải có ít nhất 1 sản phẩm'),
});

export const UpdateOrderStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus),
  note: z.string().optional(),
});

// ================= REVIEW SCHEMAS =================
export const CreateReviewSchema = z.object({
  productId: z.string().min(1),
  rating: z.number().int().min(1, 'Đánh giá tối thiểu 1 sao').max(5, 'Đánh giá tối đa 5 sao'),
  comment: z.string().min(5, 'Bình luận tối thiểu 5 ký tự').max(1000),
  images: z.array(z.string().url()).max(5).optional(),
});

// ================= CHATBOT SCHEMAS =================
export const SendChatMessageSchema = z.object({
  message: z.string().min(1, 'Tin nhắn không được để trống').max(1000, 'Tin nhắn tối đa 1000 ký tự'),
  conversationId: z.string().optional(),
});
