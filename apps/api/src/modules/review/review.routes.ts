import { Router } from 'express';
import { ReviewController } from './review.controller';
import { authenticate } from '../../core/middlewares/auth.middleware';
import { validate } from '../../core/middlewares/validate.middleware';
import { CreateReviewSchema } from '@techstore/shared';

const router = Router();

router.get('/product/:productId', ReviewController.getByProduct);
router.post('/', authenticate, validate(CreateReviewSchema), ReviewController.create);

export default router;
