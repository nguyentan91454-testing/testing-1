import { Router } from 'express';
import { ProductController } from './product.controller';
import { authenticate, requireRoles, optionalAuthenticate } from '../../core/middlewares/auth.middleware';
import { validate } from '../../core/middlewares/validate.middleware';
import { ProductQuerySchema, ProductCreateSchema, ProductUpdateSchema, Role } from '@techstore/shared';

const router = Router();

// Public product endpoints
router.get('/', validate(ProductQuerySchema, 'query'), ProductController.list);
router.get('/featured', ProductController.getFeatured);
router.get('/recommendations', optionalAuthenticate, ProductController.getPersonalized);
router.get('/detail/:slug', optionalAuthenticate, ProductController.getBySlug);
router.get('/:id', ProductController.getById);
router.get('/:id/similar', ProductController.getSimilar);
router.get('/:id/bought-together', ProductController.getFrequentlyBoughtTogether);

// Admin endpoints
router.post('/', authenticate, requireRoles(Role.ADMIN, Role.SUPER_ADMIN), validate(ProductCreateSchema), ProductController.create);
router.patch('/:id', authenticate, requireRoles(Role.ADMIN, Role.SUPER_ADMIN), validate(ProductUpdateSchema), ProductController.update);
router.delete('/:id', authenticate, requireRoles(Role.ADMIN, Role.SUPER_ADMIN), ProductController.delete);

export default router;
