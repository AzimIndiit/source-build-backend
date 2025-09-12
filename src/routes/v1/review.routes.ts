import { Router } from 'express'
import {
  createReview,
  getProductReviews,
  getUserReviews,
  updateReview,
  deleteReview,
  markReviewHelpful,
  addReviewResponse,
  updateReviewStatus,
} from '../../controllers/review/review.controller.js'
import { authenticate, authorize } from '../../middlewares/auth.middleware.js'
import { validate, validateRequest } from '../../middlewares/validation.middleware.js'
import {
  createReviewSchema,
  updateReviewSchema,
  reviewResponseSchema,
  reviewStatusSchema,
  reviewHelpfulnessSchema,
} from '../../models/review/review.validators.js'

const router = Router()

// Public routes
router.get('/products/:productId', getProductReviews)

// Protected routes
router.use(authenticate)

// User routes
router.post('/', validate(createReviewSchema, 'body'), createReview)
router.get('/my-reviews', getUserReviews)
router.put('/:reviewId', validate(updateReviewSchema, 'body'), updateReview)
router.delete('/:reviewId', deleteReview)
// router.post('/:reviewId/helpful', validateRequest(reviewHelpfulnessSchema), markReviewHelpful);
// router.post('/:reviewId/response', validateRequest(reviewResponseSchema), addReviewResponse);

// Admin routes
// router.put(
//   '/:reviewId/status',
//   authorize(['admin']),
//   validateRequest(reviewStatusSchema),
//   updateReviewStatus
// );

export default router
