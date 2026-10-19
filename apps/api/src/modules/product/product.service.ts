import { prisma } from '../../core/database/prisma';
import { cacheService } from '../../core/redis/cache.service';
import { NotFoundError } from '../../core/errors/app-error';
import { ProductStatus } from '@techstore/shared';

export interface ProductQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  categorySlug?: string;
  brandId?: string;
  brandSlug?: string;
  minPrice?: number;
  maxPrice?: number;
  rating?: number;
  inStock?: boolean;
  sort?: 'price_asc' | 'price_desc' | 'newest' | 'top_rated' | 'popular';
  isFeatured?: boolean;
  // ---- Home Decor filters ----
  style?: string;       // VD: "Tối giản", "Bắc Âu", "Japandi"
  roomType?: string;    // VD: "Phòng khách", "Bếp"
  material?: string;    // VD: "Gỗ tự nhiên", "Gốm sứ"
  color?: string;
}


export class ProductService {
  private formatProduct(p: any) {
    const parseJson = (val: any) => {
      if (!val) return undefined;
      try { return typeof val === 'string' ? JSON.parse(val) : val; } catch { return val; }
    };

    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description,
      shortDescription: p.shortDescription,
      price: p.price,
      salePrice: p.salePrice,
      status: p.status,
      isFeatured: p.isFeatured,
      rating: p.rating,
      reviewCount: p.reviewCount,
      stock: p.stock,
      specifications: parseJson(p.specifications) || {},
      // ---- Home Decor fields ----
      style: parseJson(p.style) || [],
      roomType: parseJson(p.roomType) || [],
      material: parseJson(p.material) || [],
      dimensions: parseJson(p.dimensions) || null,
      color: p.color || null,
      // ---- Relations ----
      category: p.category,
      brand: p.brand,
      images: p.images || [],
      variants: (p.variants || []).map((v: any) => ({
        ...v,
        attributes: parseJson(v.attributes) || {},
      })),
      createdAt: p.createdAt ? p.createdAt.toISOString() : undefined,
      updatedAt: p.updatedAt ? p.updatedAt.toISOString() : undefined,
    };
  }


  async queryProducts(params: ProductQueryParams) {
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 12;
    const skip = (page - 1) * limit;

    const where: any = {
      status: ProductStatus.ACTIVE,
    };

    if (params.search) {
      const searchTerm = params.search.trim();
      where.OR = [
        { name: { contains: searchTerm } },
        { description: { contains: searchTerm } },
        { shortDescription: { contains: searchTerm } },
      ];
    }

    if (params.categorySlug) {
      where.category = { slug: params.categorySlug };
    } else if (params.categoryId) {
      where.categoryId = params.categoryId;
    }

    if (params.brandSlug) {
      where.brand = { slug: params.brandSlug };
    } else if (params.brandId) {
      where.brandId = params.brandId;
    }

    if (params.minPrice !== undefined || params.maxPrice !== undefined) {
      where.price = {};
      if (params.minPrice !== undefined) where.price.gte = Number(params.minPrice);
      if (params.maxPrice !== undefined) where.price.lte = Number(params.maxPrice);
    }

    if (params.rating !== undefined) {
      where.rating = { gte: Number(params.rating) };
    }

    if (params.inStock === true) {
      where.stock = { gt: 0 };
    }

    if (params.isFeatured !== undefined) {
      where.isFeatured = params.isFeatured;
    }

    // ---- Home Decor filters (JSON contains search) ----
    if (params.style) {
      where.style = { contains: params.style };
    }
    if (params.roomType) {
      where.roomType = { contains: params.roomType };
    }
    if (params.material) {
      where.material = { contains: params.material };
    }
    if (params.color) {
      where.color = { contains: params.color };
    }

    // Determine Sort
    let orderBy: any = { createdAt: 'desc' };
    if (params.sort === 'price_asc') {
      orderBy = { price: 'asc' };
    } else if (params.sort === 'price_desc') {
      orderBy = { price: 'desc' };
    } else if (params.sort === 'top_rated') {
      orderBy = { rating: 'desc' };
    } else if (params.sort === 'popular') {
      orderBy = { reviewCount: 'desc' };
    } else if (params.sort === 'newest') {
      orderBy = { createdAt: 'desc' };
    }

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          category: true,
          brand: true,
          images: { orderBy: { sortOrder: 'asc' } },
          variants: true,
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      items: products.map((p) => this.formatProduct(p)),
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  async getFeaturedProducts(limit = 8) {
    const cacheKey = `products:featured:${limit}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) return cached;

    const products = await prisma.product.findMany({
      where: { status: ProductStatus.ACTIVE, isFeatured: true },
      take: limit,
      include: {
        category: true,
        brand: true,
        images: { orderBy: { sortOrder: 'asc' } },
        variants: true,
      },
      orderBy: { rating: 'desc' },
    });

    const result = products.map((p) => this.formatProduct(p));
    await cacheService.set(cacheKey, result, 300);
    return result;
  }

  async getBySlug(slug: string) {
    const product = await prisma.product.findUnique({
      where: { slug },
      include: {
        category: true,
        brand: true,
        images: { orderBy: { sortOrder: 'asc' } },
        variants: true,
        reviews: {
          include: {
            user: { select: { fullName: true, avatarUrl: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!product) {
      throw new NotFoundError('Không tìm thấy sản phẩm');
    }

    return {
      ...this.formatProduct(product),
      reviews: product.reviews.map((r) => ({
        id: r.id,
        productId: r.productId,
        userId: r.userId,
        user: r.user,
        rating: r.rating,
        comment: r.comment,
        images: r.images ? JSON.parse(r.images) : [],
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }

  async getById(id: string) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        brand: true,
        images: { orderBy: { sortOrder: 'asc' } },
        variants: true,
      },
    });

    if (!product) {
      throw new NotFoundError('Không tìm thấy sản phẩm');
    }

    return this.formatProduct(product);
  }

  async create(data: any) {
    const slug = data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

    const product = await prisma.product.create({
      data: {
        name: data.name,
        slug,
        description: data.description,
        shortDescription: data.shortDescription,
        price: data.price,
        salePrice: data.salePrice,
        status: data.status || ProductStatus.ACTIVE,
        isFeatured: data.isFeatured || false,
        stock: data.stock || 10,
        specifications: data.specifications ? JSON.stringify(data.specifications) : null,
        categoryId: data.categoryId,
        brandId: data.brandId,
        images: {
          create: (data.images || []).map((url: string, idx: number) => ({
            url,
            isPrimary: idx === 0,
            sortOrder: idx,
          })),
        },
        variants: data.variants
          ? {
              create: data.variants.map((v: any) => ({
                sku: v.sku,
                name: v.name,
                price: v.price,
                stock: v.stock,
                attributes: v.attributes ? JSON.stringify(v.attributes) : null,
              })),
            }
          : undefined,
      },
      include: {
        category: true,
        brand: true,
        images: true,
        variants: true,
      },
    });

    // Create inventory record
    await prisma.inventory.create({
      data: {
        productId: product.id,
        quantity: product.stock,
        reserved: 0,
      },
    });

    await cacheService.delByPattern('products:*');
    return this.formatProduct(product);
  }

  async update(id: string, data: any) {
    const updateData: any = { ...data };

    if (updateData.specifications && typeof updateData.specifications === 'object') {
      updateData.specifications = JSON.stringify(updateData.specifications);
    }

    delete updateData.images;
    delete updateData.variants;

    const product = await prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
        brand: true,
        images: true,
        variants: true,
      },
    });

    await cacheService.delByPattern('products:*');
    return this.formatProduct(product);
  }

  async delete(id: string) {
    await prisma.product.delete({ where: { id } });
    await cacheService.delByPattern('products:*');
    return true;
  }

  // ================================================================
  // HỆ THỐNG GỢI Ý SẢN PHẨM (Recommendation Engine)
  // ================================================================

  /**
   * Gợi ý sản phẩm tương tự (cùng danh mục + style/material)
   */
  async getSimilarProducts(productId: string, limit = 6) {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return [];

    const similar = await prisma.product.findMany({
      where: {
        id: { not: productId },
        status: ProductStatus.ACTIVE,
        stock: { gt: 0 },
        OR: [
          { categoryId: product.categoryId },
          { brandId: product.brandId },
          // Match theo style hoặc roomType
          ...(product.style ? [{ style: { contains: product.style.slice(2, -2).split('","')[0] } }] : []),
          ...(product.roomType ? [{ roomType: { contains: product.roomType.slice(2, -2).split('","')[0] } }] : []),
        ],
      },
      take: limit,
      include: { category: true, brand: true, images: { orderBy: { sortOrder: 'asc' }, take: 1 }, variants: true },
      orderBy: [{ categoryId: 'asc' }, { rating: 'desc' }],
    });

    return similar.map((p) => this.formatProduct(p));
  }

  /**
   * Gợi ý "Thường mua cùng nhau" — sản phẩm hay xuất hiện chung trong cùng đơn hàng
   */
  async getFrequentlyBoughtTogether(productId: string, limit = 4) {
    // Tìm các đơn hàng có sản phẩm này
    const orderItems = await prisma.orderItem.findMany({
      where: { productId },
      select: { orderId: true },
      take: 100,
    });

    if (orderItems.length === 0) {
      // Fallback: trả về sản phẩm cùng danh mục
      const product = await prisma.product.findUnique({ where: { id: productId } });
      if (!product) return [];
      return this.getSimilarProducts(productId, limit);
    }

    const orderIds = [...new Set(orderItems.map((o) => o.orderId))];

    // Đếm số lần sản phẩm khác xuất hiện trong cùng đơn hàng
    const coProducts = await prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        orderId: { in: orderIds },
        productId: { not: productId },
      },
      _count: { productId: true },
      orderBy: { _count: { productId: 'desc' } },
      take: limit,
    });

    if (coProducts.length === 0) return this.getSimilarProducts(productId, limit);

    const coProductIds = coProducts.map((p) => p.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: coProductIds }, status: ProductStatus.ACTIVE, stock: { gt: 0 } },
      include: { category: true, brand: true, images: { orderBy: { sortOrder: 'asc' }, take: 1 }, variants: true },
    });

    return products.map((p) => this.formatProduct(p));
  }

  /**
   * Track lịch sử xem sản phẩm (phục vụ personalized recommendations)
   */
  async trackProductView(productId: string, userId?: string, sessionId?: string) {
    if (!userId && !sessionId) return;

    try {
      if (userId) {
        // Upsert theo userId + productId
        await prisma.userProductView.upsert({
          where: { userId_productId: { userId, productId } },
          update: { viewCount: { increment: 1 }, lastViewedAt: new Date() },
          create: { userId, productId, viewCount: 1 },
        });
      } else if (sessionId) {
        // Anonymous session
        const existing = await prisma.userProductView.findFirst({
          where: { sessionId, productId },
        });
        if (existing) {
          await prisma.userProductView.update({
            where: { id: existing.id },
            data: { viewCount: { increment: 1 }, lastViewedAt: new Date() },
          });
        } else {
          await prisma.userProductView.create({ data: { sessionId, productId, viewCount: 1 } });
        }
      }
    } catch {
      // Silent fail — không ảnh hưởng UX
    }
  }

  /**
   * Gợi ý cá nhân hoá dựa trên lịch sử xem/mua của user
   */
  async getPersonalizedRecommendations(userId: string, limit = 8) {
    const cacheKey = `recommendations:user:${userId}:${limit}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) return cached;

    // Lấy lịch sử xem gần đây
    const recentViews = await prisma.userProductView.findMany({
      where: { userId },
      orderBy: { lastViewedAt: 'desc' },
      take: 10,
      include: { product: { select: { categoryId: true, brandId: true, style: true, roomType: true } } },
    });

    if (recentViews.length === 0) {
      // Fallback: trả sản phẩm nổi bật
      return this.getFeaturedProducts(limit);
    }

    // Tính category/brand/style phổ biến nhất từ history
    const categoryCount: Record<string, number> = {};
    const brandCount: Record<string, number> = {};

    for (const view of recentViews) {
      const cat = view.product.categoryId;
      const brand = view.product.brandId;
      categoryCount[cat] = (categoryCount[cat] || 0) + view.viewCount;
      brandCount[brand] = (brandCount[brand] || 0) + view.viewCount;
    }

    const topCategoryId = Object.entries(categoryCount).sort((a, b) => b[1] - a[1])[0]?.[0];
    const topBrandId = Object.entries(brandCount).sort((a, b) => b[1] - a[1])[0]?.[0];
    const viewedProductIds = recentViews.map((v) => v.productId);

    const recommended = await prisma.product.findMany({
      where: {
        status: ProductStatus.ACTIVE,
        stock: { gt: 0 },
        id: { notIn: viewedProductIds },
        OR: [
          { categoryId: topCategoryId },
          { brandId: topBrandId },
        ],
      },
      take: limit,
      include: { category: true, brand: true, images: { orderBy: { sortOrder: 'asc' }, take: 1 }, variants: true },
      orderBy: { rating: 'desc' },
    });

    const result = recommended.map((p) => this.formatProduct(p));
    await cacheService.set(cacheKey, result, 600); // Cache 10 phút
    return result;
  }
}

export const productService = new ProductService();
