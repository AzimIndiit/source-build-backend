import { Router } from 'express'
import { authenticate, authorize } from '@middlewares/auth.middleware.js'
import userController from '@/controllers/users/user.controller.js'
import { UserRole } from '@/models/user/user.types'
import {
  createCard,
  deleteCard,
  getSavedCards,
  setDefaultCard,
} from '@/controllers/userCard.controller'
import { createCardSchema, updateCardSchema } from '@/models/user-card/userCard.validators'
import { validate } from '@middlewares/validation.middleware.js'
import { userFilterSchema } from '@/models/user/user.validators'

const router = Router()
router.use(authenticate)
/**
 * @swagger
 * /api/v1/user/profile:
 *   put:
 *     summary: Update user profile
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               company:
 *                 type: string
 *               businessName:
 *                 type: string
 *               region:
 *                 type: string
 *               address:
 *                 type: string
 *               businessAddress:
 *                 type: string
 *               description:
 *                 type: string
 *               avatar:
 *                 type: string
 *               phone:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *       401:
 *         description: Unauthorized
 *       400:
 *         description: Bad request
 */
router.put('/profile', authenticate, userController.updateProfile)

/**
 * @swagger
 * /api/v1/user/profile:
 *   get:
 *     summary: Get user profile
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *       401:
 *         description: Unauthorized
 */
router.get('/profile', authenticate, userController.getProfile)

/**
 * @swagger
 * /api/v1/user/current-location:
 *   put:
 *     summary: Update user's current location
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               locationId:
 *                 type: string
 *                 description: ID of the saved address to set as current location
 *     responses:
 *       200:
 *         description: Current location updated successfully
 *       401:
 *         description: Unauthorized
 *       400:
 *         description: Invalid location ID
 */
router.put('/current-location', authenticate, userController.updateCurrentLocation)

/**
 * @swagger
 * /api/v1/user/cards:
 *   post:
 *     summary: Add a new payment card
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - cardNumber
 *               - expiryMonth
 *               - expiryYear
 *               - cvv
 *               - cardholderName
 *             properties:
 *               cardNumber:
 *                 type: string
 *                 pattern: '^[0-9]{13,19}$'
 *                 description: Card number (13-19 digits)
 *                 example: "4111111111111111"
 *               expiryMonth:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 12
 *                 description: Expiry month (1-12)
 *                 example: 12
 *               expiryYear:
 *                 type: number
 *                 minimum: 2024
 *                 maximum: 2044
 *                 description: Expiry year
 *                 example: 2025
 *               cvv:
 *                 type: string
 *                 pattern: '^[0-9]{3,4}$'
 *                 description: CVV code (3-4 digits)
 *                 example: "123"
 *               cardholderName:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 description: Name on the card
 *                 example: "John Doe"
 *               isDefault:
 *                 type: boolean
 *                 description: Whether this card should be set as default
 *                 example: false
 *     responses:
 *       201:
 *         description: Card added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Card added successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     card:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         cardholderName:
 *                           type: string
 *                         last4:
 *                           type: string
 *                         expiryMonth:
 *                           type: number
 *                         expiryYear:
 *                           type: number
 *                         isDefault:
 *                           type: boolean
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Buyer role required
 */
router.post('/cards', authorize(UserRole.BUYER), validate(createCardSchema, 'body'), createCard)

/**
 * @swagger
 * /api/v1/user/cards:
 *   get:
 *     summary: Get user's saved payment cards
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cards retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     cards:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           cardholderName:
 *                             type: string
 *                           last4:
 *                             type: string
 *                           expiryMonth:
 *                             type: number
 *                           expiryYear:
 *                             type: number
 *                           isDefault:
 *                             type: boolean
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Buyer role required
 */
router.get('/cards', authorize(UserRole.BUYER), getSavedCards)

/**
 * @swagger
 * /api/v1/user/cards/{id}/default:
 *   put:
 *     summary: Set a card as default payment method
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Card ID
 *         example: "64a1b2c3d4e5f6789abcdef0"
 *     responses:
 *       200:
 *         description: Default card updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Default card updated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     card:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         cardholderName:
 *                           type: string
 *                         last4:
 *                           type: string
 *                         isDefault:
 *                           type: boolean
 *                           example: true
 *       400:
 *         description: Bad request - Invalid card ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Buyer role required
 *       404:
 *         description: Card not found
 */
router.put('/cards/:id/default', authorize(UserRole.BUYER), setDefaultCard)

/**
 * @swagger
 * /api/v1/user/cards/{id}:
 *   delete:
 *     summary: Delete a payment card
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Card ID
 *         example: "64a1b2c3d4e5f6789abcdef0"
 *     responses:
 *       200:
 *         description: Card deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Card deleted successfully"
 *       400:
 *         description: Bad request - Cannot delete default card or invalid card ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Buyer role required
 *       404:
 *         description: Card not found
 */
router.delete('/cards/:id', authorize(UserRole.BUYER), deleteCard)

router.get(
  '/',
  authorize(UserRole.ADMIN),
  validate(userFilterSchema, 'query'),
  userController.getUsers
)

// User management routes (Admin only)
router.get('/:userId', authorize(UserRole.ADMIN), userController.getUserById)
router.put('/:userId/block', authorize(UserRole.ADMIN), userController.blockUser)
router.put('/:userId/unblock', authorize(UserRole.ADMIN), userController.unblockUser)
router.delete('/:userId', authorize(UserRole.ADMIN), userController.deleteUser)
router.put('/:userId/restore', authorize(UserRole.ADMIN), userController.restoreUser)

export default router
