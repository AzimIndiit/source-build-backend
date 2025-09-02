import { Router } from 'express';
import { authenticate, authorize } from '@middlewares/auth.middleware.js';
import { UserRole } from '@models/user/user.types.js';
import {
  createOrder,
  getOrders,
  getOrder,
  getOrderByNumber,
  updateOrder,
  updateOrderStatus,
  assignDriver,
  markAsDelivered,
  cancelOrder,
  initiateRefund,
  addCustomerReview,
  addDriverReview,
  getOrderStats,
  getOrderTracking,
} from '@controllers/orders/order.controller.js';

const router = Router();

/**
 * @route   POST /api/v1/orders
 * @desc    Create a new order
 * @access  Private (Buyer)
 */
router.post('/', authenticate, authorize(UserRole.BUYER), createOrder);

/**
 * @route   GET /api/v1/orders
 * @desc    Get all orders with filters
 * @access  Private
 */
router.get('/', authenticate, getOrders);

/**
 * @route   GET /api/v1/orders/stats
 * @desc    Get order statistics
 * @access  Private (Admin, Seller)
 */
router.get('/stats', authenticate, authorize(UserRole.ADMIN, UserRole.SELLER), getOrderStats);

/**
 * @route   GET /api/v1/orders/number/:orderNumber
 * @desc    Get order by order number
 * @access  Private
 */
router.get('/number/:orderNumber', authenticate, getOrderByNumber);

/**
 * @route   GET /api/v1/orders/:id
 * @desc    Get single order by ID
 * @access  Private
 */
router.get('/:id', authenticate, getOrder);

/**
 * @route   GET /api/v1/orders/:id/tracking
 * @desc    Get order tracking history
 * @access  Private
 */
router.get('/:id/tracking', authenticate, getOrderTracking);

/**
 * @route   PUT /api/v1/orders/:id
 * @desc    Update order details
 * @access  Private (Admin, Seller)
 */
router.put('/:id', authenticate, authorize(UserRole.ADMIN, UserRole.SELLER), updateOrder);

/**
 * @route   PATCH /api/v1/orders/:id/status
 * @desc    Update order status
 * @access  Private (Admin, Seller, Driver)
 */
router.patch(
  '/:id/status',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SELLER, UserRole.DRIVER),
  updateOrderStatus
);

/**
 * @route   PATCH /api/v1/orders/:id/assign-driver
 * @desc    Assign driver to order
 * @access  Private (Admin, Seller)
 */
router.patch(
  '/:id/assign-driver',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SELLER),
  assignDriver
);

/**
 * @route   PATCH /api/v1/orders/:id/deliver
 * @desc    Mark order as delivered
 * @access  Private (Driver)
 */
router.patch('/:id/deliver', authenticate, authorize(UserRole.DRIVER), markAsDelivered);

/**
 * @route   PATCH /api/v1/orders/:id/cancel
 * @desc    Cancel order
 * @access  Private (Buyer, Admin)
 */
router.patch('/:id/cancel', authenticate, authorize(UserRole.BUYER, UserRole.ADMIN), cancelOrder);

/**
 * @route   POST /api/v1/orders/:id/refund
 * @desc    Initiate refund for order
 * @access  Private (Admin)
 */
router.post('/:id/refund', authenticate, authorize(UserRole.ADMIN), initiateRefund);

/**
 * @route   POST /api/v1/orders/:id/review/customer
 * @desc    Add customer review for order
 * @access  Private (Buyer)
 */
router.post('/:id/review/customer', authenticate, authorize(UserRole.BUYER), addCustomerReview);

/**
 * @route   POST /api/v1/orders/:id/review/driver
 * @desc    Add driver review for order
 * @access  Private (Buyer)
 */
router.post('/:id/review/driver', authenticate, authorize(UserRole.BUYER), addDriverReview);

// Seller-specific routes
/**
 * @route   GET /api/v1/orders/seller/orders
 * @desc    Get all orders for a seller
 * @access  Private (Seller)
 */
router.get(
  '/seller/orders',
  authenticate,
  authorize(UserRole.SELLER),
  getOrders
);

// Driver-specific routes
/**
 * @route   GET /api/v1/orders/driver/deliveries
 * @desc    Get all deliveries for a driver
 * @access  Private (Driver)
 */
router.get(
  '/driver/deliveries',
  authenticate,
  authorize(UserRole.DRIVER),
  getOrders
);

// Customer-specific routes
/**
 * @route   GET /api/v1/orders/my-orders
 * @desc    Get all orders for authenticated customer
 * @access  Private (Buyer)
 */
router.get(
  '/my-orders',
  authenticate,
  authorize(UserRole.BUYER),
  getOrders
);

export default router;