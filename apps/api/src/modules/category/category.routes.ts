import { Router } from 'express';
import { CategoryController } from './category.controller';
import { authenticate, requireRoles } from '../../core/middlewares/auth.middleware';
import { validate } from '../../core/middlewares/validate.middleware';
import { CategoryCreateSchema, Role } from '@techstore/shared';

const router = Router();

router.get('/', CategoryController.getAll);
router.get('/:slug', CategoryController.getBySlug);
router.post('/', authenticate, requireRoles(Role.ADMIN, Role.SUPER_ADMIN), validate(CategoryCreateSchema), CategoryController.create);
router.patch('/:id', authenticate, requireRoles(Role.ADMIN, Role.SUPER_ADMIN), CategoryController.update);
router.delete('/:id', authenticate, requireRoles(Role.ADMIN, Role.SUPER_ADMIN), CategoryController.delete);

export default router;
