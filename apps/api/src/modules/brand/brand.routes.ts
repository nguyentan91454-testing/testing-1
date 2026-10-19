import { Router } from 'express';
import { BrandController } from './brand.controller';
import { authenticate, requireRoles } from '../../core/middlewares/auth.middleware';
import { validate } from '../../core/middlewares/validate.middleware';
import { BrandCreateSchema, Role } from '@techstore/shared';

const router = Router();

router.get('/', BrandController.getAll);
router.get('/:slug', BrandController.getBySlug);
router.post('/', authenticate, requireRoles(Role.ADMIN, Role.SUPER_ADMIN), validate(BrandCreateSchema), BrandController.create);
router.patch('/:id', authenticate, requireRoles(Role.ADMIN, Role.SUPER_ADMIN), BrandController.update);
router.delete('/:id', authenticate, requireRoles(Role.ADMIN, Role.SUPER_ADMIN), BrandController.delete);

export default router;
