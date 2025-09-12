import { Request, Response } from 'express'
import { catchAsync } from '../../utils/catchAsync.js'
import Review from '../../models/review/review.model.js'
import { ReviewType, ReviewStatus } from '../../models/review/review.types.js'
import ApiResponse from '../../utils/ApiResponse.js'

// Create or update a review
export const createReview = catchAsync(async (req: Request, res: Response) => {
  const { type, product, rating, comment, title } = req.body
  const reviewer = req.user?.id

  // Validate based on review type
  if (type === ReviewType.PRODUCT && !product) {
    return ApiResponse.error(res, 'Product ID is required for product reviews', 400)
  }

  // Check if review already exists
  const existingReview = await Review.findOne({
    reviewer,
    ...(product && { product }),
    type,
  })

  let review;
  let message;

  if (existingReview) {
    // Update existing review
    existingReview.rating = rating
    existingReview.comment = comment
    if (title !== undefined) existingReview.title = title
    await existingReview.save()
    review = existingReview
    message = 'Review updated successfully'
  } else {
    // Create new review
    review = await Review.create({
      type,
      product,
      reviewer,
      rating,
      comment,
      title,
    })
    message = 'Review created successfully'
  }

  const populatedReview = await Review.findById(review._id)
    .populate('product', 'title images price')
    .populate('reviewer', 'firstName lastName avatar')

  ApiResponse.success(res, populatedReview, message, existingReview ? 200 : 201)
})

// Get reviews for a product
export const getProductReviews = catchAsync(async (req: Request, res: Response) => {
  const { productId } = req.params
  const { page = 1, limit = 10, sort = '-createdAt', rating } = req.query

  const query: any = {
    product: productId,
    type: ReviewType.PRODUCT,
    status: ReviewStatus.APPROVED,
  }

  if (rating) {
    query.rating = Number(rating)
  }

  const reviews = await Review.find(query)
    .populate('reviewer', 'firstName lastName profile ')
    .sort(sort as string)
    .limit(Number(limit))
    .skip((Number(page) - 1) * Number(limit))

  const total = await Review.countDocuments(query)

  // Get review stats
  const stats = await Review.getReviewStats(productId as any, ReviewType.PRODUCT)

  ApiResponse.success(
    res,
    {
      reviews,
      stats,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    },
    'Reviews retrieved successfully'
  )
})

// Get user's reviews
export const getUserReviews = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id
  const { page = 1, limit = 10, type } = req.query

  const query: any = { reviewer: userId }
  if (type) {
    query.type = type
  }

  const reviews = await Review.find(query)
    .populate('product', 'title images price')
    .populate('reviewee', 'firstName lastName avatar')
    .sort('-createdAt')
    .limit(Number(limit))
    .skip((Number(page) - 1) * Number(limit))

  const total = await Review.countDocuments(query)

  ApiResponse.success(
    res,
    {
      reviews,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    },
    'User reviews retrieved successfully'
  )
})

// Update a review
export const updateReview = catchAsync(async (req: Request, res: Response) => {
  const { reviewId } = req.params
  const { rating, title, comment, images } = req.body
  const userId = req.user?.id

  const review = await Review.findOne({
    _id: reviewId,
    reviewer: userId,
  })

  if (!review) {
    return ApiResponse.error(res, 'Review not found or you are not authorized', 404)
  }

  // Update fields
  if (rating !== undefined) review.rating = rating
  if (title !== undefined) review.title = title
  if (comment !== undefined) review.comment = comment
  if (images !== undefined) review.images = images

  await review.save()

  const updatedReview = await Review.findById(review._id)
    .populate('reviewer', 'firstName lastName avatar')
    .populate('product', 'title images price')
    .populate('reviewee', 'firstName lastName avatar')

  ApiResponse.success(res, updatedReview, 'Review updated successfully')
})

// Delete a review
export const deleteReview = catchAsync(async (req: Request, res: Response) => {
  const { reviewId } = req.params
  const userId = req.user?.id

  const review = await Review.findOneAndDelete({
    _id: reviewId,
    reviewer: userId,
  })

  if (!review) {
    return ApiResponse.error(res, 'Review not found or you are not authorized', 404)
  }

  ApiResponse.success(res, null, 'Review deleted successfully')
})

// Mark review as helpful
export const markReviewHelpful = catchAsync(async (req: Request, res: Response) => {
  const { reviewId } = req.params
  const { helpful } = req.body
  const userId = req.user?.id

  const review = await Review.findById(reviewId)

  if (!review) {
    return ApiResponse.error(res, 'Review not found', 404)
  }

  if (helpful) {
    await review.markAsHelpful(userId)
  } else {
    await review.markAsNotHelpful(userId)
  }

  ApiResponse.success(res, review, 'Review marked successfully')
})

// Add response to a review (for sellers)
export const addReviewResponse = catchAsync(async (req: Request, res: Response) => {
  const { reviewId } = req.params
  const { comment } = req.body
  const userId = req.user?.id

  const review = await Review.findById(reviewId)

  if (!review) {
    return ApiResponse.error(res, 'Review not found', 404)
  }

  // Check if user is the seller/reviewee
  if (review.reviewee?.toString() !== userId) {
    return ApiResponse.error(res, 'You are not authorized to respond to this review', 403)
  }

  await review.addResponse(comment, userId)

  const updatedReview = await Review.findById(review._id)
    .populate('reviewer', 'firstName lastName avatar')
    .populate('response.respondedBy', 'firstName lastName avatar')

  ApiResponse.success(res, updatedReview, 'Response added successfully')
})

// Admin: Update review status
export const updateReviewStatus = catchAsync(async (req: Request, res: Response) => {
  const { reviewId } = req.params
  const { status, reason } = req.body

  const review = await Review.findById(reviewId)

  if (!review) {
    return ApiResponse.error(res, 'Review not found', 404)
  }

  switch (status) {
    case ReviewStatus.APPROVED:
      await review.approve()
      break
    case ReviewStatus.REJECTED:
      await review.reject(reason || 'Review rejected by admin')
      break
    case ReviewStatus.FLAGGED:
      await review.flag(reason || 'Review flagged for review')
      break
    default:
      review.status = status
      await review.save()
  }

  ApiResponse.success(res, review, 'Review status updated successfully')
})
