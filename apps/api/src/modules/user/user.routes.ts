import { Router } from 'express';
import { UserController } from './user.controller';
import { authenticate, requireRoles } from '../../core/middlewares/auth.middleware';
import { validate } from '../../core/middlewares/validate.middleware';
import { UpdateProfileSchema, AddressSchema, Role } from '@techstore/shared';

const router = Router();

router.use(authenticate);

router.get('/profile', UserController.getProfile);
router.patch('/profile', validate(UpdateProfileSchema), UserController.updateProfile);

router.get('/addresses', UserController.getAddresses);
router.post('/addresses', validate(AddressSchema), UserController.addAddress);
router.delete('/addresses/:addressId', UserController.deleteAddress);

// Admin User Routes
router.get('/admin/all', requireRoles(Role.ADMIN, Role.SUPER_ADMIN), UserController.getAllUsers);
router.patch('/admin/:userId/status', requireRoles(Role.ADMIN, Role.SUPER_ADMIN), UserController.updateStatus);
router.patch('/admin/:userId/role', requireRoles(Role.SUPER_ADMIN), UserController.updateRole);

export default router;
