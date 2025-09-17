import { Router } from 'express'
import * as cartController from '@controllers/cart/cart.controller'
import { authenticate } from '@middlewares/auth.middleware'
import { validate } from '@middlewares/validation.middleware'
import {
  addToCartSchema,
  removeFromCartSchema,
  updateCartItemSchema,
} from '@/models/cart/cart.validators'

const router = Router()

// All cart routes require authentication
router.use(authenticate)

// Get user's cart with real-time prices
router.get('/', cartController.getCart)

// Get cart item count
// router.get('/count', cartController.getCartCount)

// Add item to cart
router.post('/add', validate(addToCartSchema), cartController.addToCart)

// Update item quantity
router.put('/update', validate(updateCartItemSchema), cartController.updateCartItem)

// Remove item from cart (with variant)
router.delete(
  '/remove/:productId/:variantId',
  validate(removeFromCartSchema),
  cartController.removeFromCart
)

// Remove item from cart (without variant)
router.delete(
  '/remove/:productId',
  validate(removeFromCartSchema, 'params'),
  cartController.removeFromCart
)

// Clear entire cart
router.delete('/clear', cartController.clearCart)

export default router
