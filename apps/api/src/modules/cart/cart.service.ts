import { prisma } from '../../core/database/prisma';
import { BadRequestError, NotFoundError } from '../../core/errors/app-error';
import { APP_DEFAULTS, ProductStatus } from '@techstore/shared';

export class CartService {
  async getOrCreateCart(userId: string) {
    let cart = await prisma.cart.findUnique({
      where: { userId },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId },
      });
    }

    return cart;
  }

  async getCart(userId: string) {
    const cart = await this.getOrCreateCart(userId);

    const cartItems = await prisma.cartItem.findMany({
      where: { cartId: cart.id },
      include: {
        product: {
          include: {
            images: { orderBy: { sortOrder: 'asc' } },
            category: true,
            brand: true,
          },
        },
        variant: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    let subtotal = 0;
    const formattedItems = cartItems.map((item) => {
      const unitPrice = item.variant?.salePrice || item.variant?.price || item.product.salePrice || item.product.price;
      const totalPrice = unitPrice * item.quantity;
      subtotal += totalPrice;

      return {
        id: item.id,
        productId: item.productId,
        variantId: item.variantId,
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
        variant: item.variant
          ? {
              id: item.variant.id,
              sku: item.variant.sku,
              name: item.variant.name,
              price: item.variant.price,
              salePrice: item.variant.salePrice,
              stock: item.variant.stock,
            }
          : null,
        quantity: item.quantity,
        unitPrice,
        totalPrice,
      };
    });

    const shippingFee = subtotal >= APP_DEFAULTS.FREE_SHIPPING_THRESHOLD || subtotal === 0 ? 0 : APP_DEFAULTS.STANDARD_SHIPPING_FEE;
    const total = subtotal + shippingFee;

    return {
      id: cart.id,
      items: formattedItems,
      subtotal,
      discountAmount: 0,
      shippingFee,
      total,
      itemCount: formattedItems.reduce((acc, curr) => acc + curr.quantity, 0),
    };
  }

  async addToCart(userId: string, productId: string, variantId?: string | null, quantity = 1) {
    const cart = await this.getOrCreateCart(userId);

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { variants: true },
    });

    if (!product || product.status !== ProductStatus.ACTIVE) {
      throw new NotFoundError('Sản phẩm không tồn tại hoặc đã ngừng kinh doanh');
    }

    let availableStock = product.stock;
    if (variantId) {
      const variant = product.variants.find((v) => v.id === variantId);
      if (!variant) throw new NotFoundError('Biến thể sản phẩm không tồn tại');
      availableStock = variant.stock;
    }

    if (availableStock < quantity) {
      throw new BadRequestError(`Số lượng tồn kho không đủ (chỉ còn ${availableStock} sản phẩm)`);
    }

    // Check existing item
    const existingItem = await prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId,
        variantId: variantId || null,
      },
    });

    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;
      if (newQuantity > availableStock) {
        throw new BadRequestError(`Bạn đã có ${existingItem.quantity} sản phẩm này trong giỏ, không thể thêm quá số lượng tồn (${availableStock})`);
      }

      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQuantity },
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId,
          variantId: variantId || null,
          quantity,
        },
      });
    }

    return this.getCart(userId);
  }

  async updateQuantity(userId: string, itemId: string, quantity: number) {
    const cart = await this.getOrCreateCart(userId);

    const item = await prisma.cartItem.findFirst({
      where: { id: itemId, cartId: cart.id },
      include: { product: true, variant: true },
    });

    if (!item) {
      throw new NotFoundError('Mục trong giỏ hàng không tồn tại');
    }

    const availableStock = item.variant?.stock ?? item.product.stock;
    if (quantity > availableStock) {
      throw new BadRequestError(`Số lượng yêu cầu vượt quá tồn kho (tối đa ${availableStock})`);
    }

    await prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity },
    });

    return this.getCart(userId);
  }

  async removeItem(userId: string, itemId: string) {
    const cart = await this.getOrCreateCart(userId);

    await prisma.cartItem.deleteMany({
      where: { id: itemId, cartId: cart.id },
    });

    return this.getCart(userId);
  }

  async clearCart(userId: string) {
    const cart = await this.getOrCreateCart(userId);

    await prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    return this.getCart(userId);
  }
}

export const cartService = new CartService();
