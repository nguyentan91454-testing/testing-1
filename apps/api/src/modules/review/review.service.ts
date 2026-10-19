import { prisma } from '../../core/database/prisma';
import { BadRequestError, NotFoundError } from '../../core/errors/app-error';

export class ReviewService {
  async createReview(userId: string, data: { productId: string; rating: number; comment: string; images?: string[] }) {
    const product = await prisma.product.findUnique({
      where: { id: data.productId },
    });

    if (!product) {
      throw new NotFoundError('Không tìm thấy sản phẩm');
    }

    // Check if user actually bought this product
    const verifiedOrder = await prisma.order.findFirst({
      where: {
        userId,
        status: 'DELIVERED',
        items: {
          some: { productId: data.productId },
        },
      },
    });

    const isVerifiedPurchase = Boolean(verifiedOrder);

    const review = await prisma.review.create({
      data: {
        productId: data.productId,
        userId,
        rating: data.rating,
        comment: data.comment,
        images: data.images ? JSON.stringify(data.images) : null,
        isVerifiedPurchase,
      },
      include: {
        user: { select: { fullName: true, avatarUrl: true } },
      },
    });

    // Recalculate average product rating
    const stats = await prisma.review.aggregate({
      where: { productId: data.productId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    const avgRating = stats._avg.rating ? Math.round(stats._avg.rating * 10) / 10 : data.rating;
    const reviewCount = stats._count.rating;

    await prisma.product.update({
      where: { id: data.productId },
      data: {
        rating: avgRating,
        reviewCount,
      },
    });

    return {
      id: review.id,
      productId: review.productId,
      userId: review.userId,
      user: review.user,
      rating: review.rating,
      comment: review.comment,
      images: review.images ? JSON.parse(review.images) : [],
      isVerifiedPurchase: review.isVerifiedPurchase,
      createdAt: review.createdAt.toISOString(),
    };
  }

  async getProductReviews(productId: string) {
    const reviews = await prisma.review.findMany({
      where: { productId },
      include: {
        user: { select: { fullName: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return reviews.map((r) => ({
      id: r.id,
      productId: r.productId,
      userId: r.userId,
      user: r.user,
      rating: r.rating,
      comment: r.comment,
      images: r.images ? JSON.parse(r.images) : [],
      isVerifiedPurchase: r.isVerifiedPurchase,
      createdAt: r.createdAt.toISOString(),
    }));
  }
}

export const reviewService = new ReviewService();
