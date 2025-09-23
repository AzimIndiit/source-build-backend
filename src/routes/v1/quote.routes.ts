import { Router } from 'express'
import { authenticate, authorize } from '../../middlewares/auth.middleware.js'
import { UserRole } from '../../models/user/user.types.js'
import {
  createQuoteRequest,
  getQuotes,
  getQuoteById,
  updateQuoteStatus,
  provideQuoteResponse,
  deleteQuote,
  getQuoteStatistics
} from '../../controllers/quotes/quote.controller.js'

const router = Router()

// Protected routes - require authentication
router.use(authenticate)

// Create a new quote request (any authenticated user)
router.post('/request', createQuoteRequest)

// Get all quotes (filtered by user role)
router.get('/', getQuotes)

// Get quote statistics (admin/seller only)
router.get(
  '/statistics',
  authorize(UserRole.ADMIN, UserRole.SELLER),
  getQuoteStatistics
)

// Get single quote by ID
router.get('/:id', getQuoteById)

// Update quote status (admin/seller only)
router.patch(
  '/:id/status',
  authorize(UserRole.ADMIN, UserRole.SELLER),
  updateQuoteStatus
)

// Provide quote response (admin/seller only)
router.put(
  '/:id/response',
  authorize(UserRole.ADMIN, UserRole.SELLER),
  provideQuoteResponse
)

// Delete quote
router.delete('/:id', deleteQuote)

export default router