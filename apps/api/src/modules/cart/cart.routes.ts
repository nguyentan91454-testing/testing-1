import { Router } from 'express';
import { CartController } from './cart.controller';
import { authenticate } from '../../core/middlewares/auth.middleware';
import { validate } from '../../core/middlewares/validate.middleware';
import { AddToCartSchema, UpdateCartItemSchema } from '@techstore/shared';

const router = Router();

router.use(authenticate);

router.get('/', CartController.getCart);
router.post('/items', validate(AddToCartSchema), CartController.addItem);
router.patch('/items/:itemId', validate(UpdateCartItemSchema), CartController.updateQuantity);
router.delete('/items/:itemId', CartController.removeItem);
router.delete('/', CartController.clearCart);

export default router;
