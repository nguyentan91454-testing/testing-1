import { Router } from 'express';
import { ChatController } from './chat.controller';
import { optionalAuthenticate } from '../../core/middlewares/auth.middleware';
import { validate } from '../../core/middlewares/validate.middleware';
import { aiRateLimiter } from '../../core/middlewares/rate-limit.middleware';
import { SendChatMessageSchema } from '@techstore/shared';

const router = Router();

router.get('/health', ChatController.healthCheck);
router.post('/messages', aiRateLimiter, optionalAuthenticate, validate(SendChatMessageSchema), ChatController.sendMessage);
router.get('/conversations/:conversationId', optionalAuthenticate, ChatController.getHistory);

export default router;
