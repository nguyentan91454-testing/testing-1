import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes';
import userRoutes from '../modules/user/user.routes';
import categoryRoutes from '../modules/category/category.routes';
import brandRoutes from '../modules/brand/brand.routes';
import productRoutes from '../modules/product/product.routes';
import cartRoutes from '../modules/cart/cart.routes';
import couponRoutes from '../modules/coupon/coupon.routes';
import orderRoutes from '../modules/order/order.routes';
import reviewRoutes from '../modules/review/review.routes';
import wishlistRoutes from '../modules/wishlist/wishlist.routes';
import adminRoutes from '../modules/admin/admin.routes';
import chatRoutes from '../modules/chat/chat.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/categories', categoryRoutes);
router.use('/brands', brandRoutes);
router.use('/products', productRoutes);
router.use('/cart', cartRoutes);
router.use('/coupons', couponRoutes);
router.use('/orders', orderRoutes);
router.use('/reviews', reviewRoutes);
router.use('/wishlist', wishlistRoutes);
router.use('/admin', adminRoutes);
router.use('/chat', chatRoutes);

export default router;
