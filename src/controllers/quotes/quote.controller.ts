import { Request, Response } from 'express'
import { Types } from 'mongoose'
import catchAsync from '@utils/catchAsync.js'
import ApiResponse from '@utils/ApiResponse.js'
import ApiError from '@utils/ApiError.js'
import QuoteModel from '@models/quote/quote.model.js'
import { QuoteStatus, CreateQuoteDTO, UpdateQuoteDTO } from '@models/quote/quote.types.js'
import { validate } from '@/middlewares/validation.middleware.js'
import {
  createQuoteSchema,
  updateQuoteStatusSchema,
  updateQuoteResponseSchema,
  getQuotesSchema,
  idParamsSchema
} from '@models/quote/quote.validators.js'

// Create a new quote request
export const createQuoteRequest = [
  validate(createQuoteSchema),
  catchAsync(async (req: Request, res: Response) => {
    const quoteData: CreateQuoteDTO = req.body
    const userId = req.user?.id

    if (!userId) {
      throw ApiError.unauthorized('User authentication required')
    }

    // Get image URLs from request body (already uploaded via file service)
    let imageUrls: string[] = []
    
    // Handle both single and multiple image URLs
    if (req.body.images) {
      if (Array.isArray(req.body.images)) {
        imageUrls = req.body.images.filter((url: any) => typeof url === 'string')
      } else if (typeof req.body.images === 'string') {
        imageUrls = [req.body.images]
      }
    }

    // Create the quote
    const quote = await QuoteModel.create({
      user: userId,
      projectType: quoteData.projectType,
      installationLocation: quoteData.installationLocation,
      spaceWidth: parseFloat(quoteData.spaceWidth),
      spaceHeight: parseFloat(quoteData.spaceHeight),
      existingDesign: quoteData.existingDesign,
      cabinetStyle: quoteData.cabinetStyle,
      material: quoteData.material,
      finishColor: quoteData.finishColor,
      additionalComments: quoteData.additionalComments,
      images: imageUrls,
      status: QuoteStatus.PENDING
    })

    await quote.populate('user', 'displayName email phone')

    return ApiResponse.created(res, quote, 'Quote request created successfully')
  })
]

// Get all quotes (with filters)
export const getQuotes = [
  validate(getQuotesSchema, 'query'),
  catchAsync(async (req: Request, res: Response) => {
    const { 
      status, 
      page = 1, 
      limit = 10, 
      sortBy = 'createdAt', 
      sortOrder = 'desc' 
    } = req.query

    const userId = req.user?.id
    const userRole = req.user?.role

    // Build filter
    let filter: any = {}
    
    // If user is not admin/seller, only show their own quotes
    if (userRole !== 'admin' && userRole !== 'seller') {
      filter.user = userId
    }
    
    if (status) {
      filter.status = status
    }

    // Calculate pagination
    const skip = (Number(page) - 1) * Number(limit)
    const sort: any = { [sortBy as string]: sortOrder === 'asc' ? 1 : -1 }

    // Execute query
    const [quotes, total] = await Promise.all([
      QuoteModel.find(filter)
        .populate('user', 'displayName email phone')
        .populate('respondedBy', 'displayName email')
        .sort(sort)
        .skip(skip)
        .limit(Number(limit)),
      QuoteModel.countDocuments(filter)
    ])

    const totalPages = Math.ceil(total / Number(limit))

    return ApiResponse.successWithPagination(
      res,
      { quotes },
      {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: totalPages,
        hasNext: Number(page) < totalPages,
        hasPrev: Number(page) > 1
      },
      'Quotes retrieved successfully'
    )
  })
]

// Get single quote by ID
export const getQuoteById = [
  validate(idParamsSchema, 'params'),
  catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params
    const userId = req.user?.id
    const userRole = req.user?.role

    if (!Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest('Invalid quote ID')
    }

    const quote = await QuoteModel.findById(id)
      .populate('user', 'displayName email phone')
      .populate('respondedBy', 'displayName email')

    if (!quote) {
      throw ApiError.notFound('Quote not found')
    }

    // Check authorization: users can only see their own quotes unless admin/seller
    if (userRole !== 'admin' && userRole !== 'seller' && quote.user.toString() !== userId) {
      throw ApiError.forbidden('You are not authorized to view this quote')
    }

    return ApiResponse.success(res, quote, 'Quote retrieved successfully')
  })
]

// Update quote status (admin/seller only)
export const updateQuoteStatus = [
  validate(idParamsSchema, 'params'),
  validate(updateQuoteStatusSchema),
  catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params
    const { status } = req.body
    const userRole = req.user?.role

    // Check if user is admin or seller
    if (userRole !== 'admin' && userRole !== 'seller') {
      throw ApiError.forbidden('Only admin or seller can update quote status')
    }

    if (!Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest('Invalid quote ID')
    }

    const quote = await QuoteModel.findById(id)

    if (!quote) {
      throw ApiError.notFound('Quote not found')
    }

    // Update status
    quote.status = status
    await quote.save()

    await quote.populate('user', 'displayName email phone')
    await quote.populate('respondedBy', 'displayName email')

    return ApiResponse.success(res, quote, 'Quote status updated successfully')
  })
]

// Provide quote response (admin/seller only)
export const provideQuoteResponse = [
  validate(idParamsSchema, 'params'),
  validate(updateQuoteResponseSchema),
  catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params
    const { quotedPrice, estimatedTime, responseNotes, status } = req.body
    const userId = req.user?.id
    const userRole = req.user?.role

    // Check if user is admin or seller
    if (userRole !== 'admin' && userRole !== 'seller') {
      throw ApiError.forbidden('Only admin or seller can provide quote response')
    }

    if (!Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest('Invalid quote ID')
    }

    const quote = await QuoteModel.findById(id)

    if (!quote) {
      throw ApiError.notFound('Quote not found')
    }

    // Update quote with response
    quote.quotedPrice = quotedPrice
    quote.estimatedTime = estimatedTime
    quote.responseNotes = responseNotes
    quote.respondedBy = new Types.ObjectId(userId)
    quote.respondedAt = new Date()
    
    // Update status if provided
    if (status) {
      quote.status = status
    }

    await quote.save()

    await quote.populate('user', 'displayName email phone')
    await quote.populate('respondedBy', 'displayName email')

    return ApiResponse.success(res, quote, 'Quote response provided successfully')
  })
]

// Delete quote
export const deleteQuote = [
  validate(idParamsSchema, 'params'),
  catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params
    const userId = req.user?.id
    const userRole = req.user?.role

    if (!Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest('Invalid quote ID')
    }

    const quote = await QuoteModel.findById(id)

    if (!quote) {
      throw ApiError.notFound('Quote not found')
    }

    // Check authorization: users can only delete their own quotes unless admin
    if (userRole !== 'admin' && quote.user.toString() !== userId) {
      throw ApiError.forbidden('You are not authorized to delete this quote')
    }

    // Note: Images are managed through the file service, 
    // so they should be deleted separately if needed

    await quote.deleteOne()

    return ApiResponse.success(res, null, 'Quote deleted successfully')
  })
]

// Get quote statistics (admin/seller only)
export const getQuoteStatistics = catchAsync(async (req: Request, res: Response) => {
  const userRole = req.user?.role

  // Check if user is admin or seller
  if (userRole !== 'admin' && userRole !== 'seller') {
    throw ApiError.forbidden('Only admin or seller can view quote statistics')
  }

  const [
    totalQuotes,
    pendingQuotes,
    inProgressQuotes,
    completedQuotes,
    rejectedQuotes
  ] = await Promise.all([
    QuoteModel.countDocuments(),
    QuoteModel.countDocuments({ status: QuoteStatus.PENDING }),
    QuoteModel.countDocuments({ status: QuoteStatus.IN_PROGRESS }),
    QuoteModel.countDocuments({ status: QuoteStatus.COMPLETED }),
    QuoteModel.countDocuments({ status: QuoteStatus.REJECTED })
  ])

  const statistics = {
    total: totalQuotes,
    byStatus: {
      pending: pendingQuotes,
      inProgress: inProgressQuotes,
      completed: completedQuotes,
      rejected: rejectedQuotes
    },
    completionRate: totalQuotes > 0 
      ? ((completedQuotes / totalQuotes) * 100).toFixed(2) + '%'
      : '0%'
  }

  return ApiResponse.success(res, statistics, 'Quote statistics retrieved successfully')
})