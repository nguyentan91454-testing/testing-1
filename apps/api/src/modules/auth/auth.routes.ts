import { Router } from 'express';
import { AuthController } from './auth.controller';
import { validate } from '../../core/middlewares/validate.middleware';
import { authenticate } from '../../core/middlewares/auth.middleware';
import { authRateLimiter } from '../../core/middlewares/rate-limit.middleware';
import {
  RegisterSchema,
  LoginSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  ChangePasswordSchema,
} from '@techstore/shared';

const router = Router();

router.post('/register', authRateLimiter, validate(RegisterSchema), AuthController.register);
router.post('/login', authRateLimiter, validate(LoginSchema), AuthController.login);
router.post('/refresh', AuthController.refreshToken);
router.post('/logout', authenticate, AuthController.logout);
router.get('/me', authenticate, AuthController.getMe);
router.post('/forgot-password', authRateLimiter, validate(ForgotPasswordSchema), AuthController.forgotPassword);
router.post('/reset-password', authRateLimiter, validate(ResetPasswordSchema), AuthController.resetPassword);
router.post('/change-password', authenticate, validate(ChangePasswordSchema), AuthController.changePassword);

export default router;
