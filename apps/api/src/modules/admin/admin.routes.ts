import { Router } from 'express';
import { AdminController } from './admin.controller';
import { authenticate, requireRoles } from '../../core/middlewares/auth.middleware';
import { Role } from '@techstore/shared';

const router = Router();

router.use(authenticate, requireRoles(Role.ADMIN, Role.SUPER_ADMIN));

router.get('/stats', AdminController.getStats);
router.get('/audit-logs', AdminController.getAuditLogs);

export default router;
