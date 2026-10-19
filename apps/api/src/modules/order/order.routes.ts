import { Router } from 'express';
import { OrderController } from './order.controller';
import { authenticate, requireRoles, optionalAuthenticate } from '../../core/middlewares/auth.middleware';
import { validate } from '../../core/middlewares/validate.middleware';
import { CreateOrderSchema, UpdateOrderStatusSchema, Role } from '@techstore/shared';

const router = Router();

router.post('/', authenticate, validate(CreateOrderSchema), OrderController.createOrder);
router.get('/my-orders', authenticate, OrderController.getMyOrders);
router.get('/:id', optionalAuthenticate, OrderController.getById);
router.post('/:id/cancel', authenticate, OrderController.cancelOrder);

// Admin order status management
router.patch('/:id/status', authenticate, requireRoles(Role.ADMIN, Role.SUPER_ADMIN), validate(UpdateOrderStatusSchema), OrderController.updateStatus);

export default router;
