import { Router } from 'express';
import { CouponController } from './coupon.controller';
import { authenticate, requireRoles } from '../../core/middlewares/auth.middleware';
import { validate } from '../../core/middlewares/validate.middleware';
import { ApplyCouponSchema, CouponCreateSchema, Role } from '@techstore/shared';

const router = Router();

router.post('/validate', authenticate, validate(ApplyCouponSchema), CouponController.validateCoupon);
router.get('/', authenticate, requireRoles(Role.ADMIN, Role.SUPER_ADMIN), CouponController.getAll);
router.post('/', authenticate, requireRoles(Role.ADMIN, Role.SUPER_ADMIN), validate(CouponCreateSchema), CouponController.create);
router.delete('/:id', authenticate, requireRoles(Role.ADMIN, Role.SUPER_ADMIN), CouponController.delete);

export default router;
