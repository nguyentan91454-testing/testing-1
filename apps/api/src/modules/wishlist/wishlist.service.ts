import { prisma } from '../../core/database/prisma';
import { NotFoundError } from '../../core/errors/app-error';

export class WishlistService {
  async getWishlist(userId: string) {
    const items = await prisma.wishlist.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            images: { orderBy: { sortOrder: 'asc' } },
            category: true,
            brand: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return items.map((item) => ({
      id: item.id,
      productId: item.productId,
      product: {
        id: item.product.id,
        name: item.product.name,
        slug: item.product.slug,
        price: item.product.price,
        salePrice: item.product.salePrice,
        rating: item.product.rating,
        reviewCount: item.product.reviewCount,
        stock: item.product.stock,
        images: item.product.images,
        category: item.product.category,
        brand: item.product.brand,
      },
      createdAt: item.createdAt.toISOString(),
    }));
  }

  async toggleWishlist(userId: string, productId: string) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundError('Sản phẩm không tồn tại');
    }

    const existing = await prisma.wishlist.findUnique({
      where: {
        userId_productId: { userId, productId },
      },
    });

    if (existing) {
      await prisma.wishlist.delete({ where: { id: existing.id } });
      return { isSaved: false, message: 'Đã xóa khỏi danh sách yêu thích' };
    } else {
      await prisma.wishlist.create({
        data: { userId, productId },
      });
      return { isSaved: true, message: 'Đã thêm vào danh sách yêu thích' };
    }
  }
}

export const wishlistService = new WishlistService();
