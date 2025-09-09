import { Request, Response } from 'express';
import catchAsync from '@utils/catchAsync.js';
import ApiResponse from '@utils/ApiResponse.js';
import ApiError from '@utils/ApiError.js';
import orderService from '@services/order.service.js';
import { validate } from '@middlewares/validation.middleware.js';
import logger from '@config/logger.js';
import {
  createOrderSchema,
  updateOrderSchema,
  orderFilterSchema,
  orderIdSchema,
  orderNumberSchema,
  updateOrderStatusSchema,
  assignDriverSchema,
  markAsDeliveredSchema,
  cancelOrderSchema,
  initiateRefundSchema,
  addReviewSchema,
  CreateOrderInput,
  UpdateOrderInput,
} from '@models/order/order.validators.js';
import { OrderStatus } from '@models/order/order.types.js';

/**
 * Create a new order
 */
export const createOrder = [
  validate(createOrderSchema),
  catchAsync(async (req: Request, res: Response) => {
    const orderData: CreateOrderInput = req.body;
    const userId = req.user?.id;
    
    if (!userId) {
      throw ApiError.unauthorized('User not authenticated');
    }
    
    const order = await orderService.createOrder(orderData, userId);
    
    logger.info('Order created', { orderId: order.id, userId });
    
    return ApiResponse.created(res, order, 'Order created successfully');
  })
];

/**
 * Get all orders with filters
 */
export const getOrders = [
  validate(orderFilterSchema, 'query'),
  catchAsync(async (req: Request, res: Response) => {
    const filters = req.query as any;
    const userId = req.user?.id;
    const userRole = req.user?.role;
    
    const result = await orderService.getOrders(filters, userId, userRole);
    
    return ApiResponse.successWithPagination(
      res,
      result.orders,
      result.pagination,
      'Orders retrieved successfully'
    );
  })
];

/**
 * Get single order by ID
 */
export const getOrder = [
  validate(orderNumberSchema, 'params'),
  catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    
    const order = await orderService.getOrderById(id as string);
    
    return ApiResponse.success(res, order, 'Order retrieved successfully');
  })
];

/**
 * Get order by order number
 */
export const getOrderByNumber = [
  validate(orderNumberSchema, 'params'),
  catchAsync(async (req: Request, res: Response) => {
    const { orderNumber } = req.params;
    
    const order = await orderService.getOrderByNumber(orderNumber as string);
    
    return ApiResponse.success(res, order, 'Order retrieved successfully');
  })
];

/**
 * Update order details
 */
export const updateOrder = [
  validate(orderIdSchema, 'params'),
  validate(updateOrderSchema),
  catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const updateData: UpdateOrderInput = req.body;
    const userId = req.user?.id;
    
    if (!userId) {
      throw ApiError.unauthorized('User not authenticated');
    }
    
    const order = await orderService.getOrderById(id as string);
    
    Object.assign(order, updateData);
    await order.save();
    
    logger.info('Order updated', { orderId: id, userId });
    
    return ApiResponse.success(res, order, 'Order updated successfully');
  })
];

/**
 * Update order status
 */
export const updateOrderStatus = [
  validate(orderIdSchema, 'params'),
  validate(updateOrderStatusSchema),
  catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user?.id;
    
    const order = await orderService.updateOrderStatus(id as string, status, userId);
    
    logger.info('Order status updated', { orderId: id, status, userId });
    
    return ApiResponse.success(res, order, 'Order status updated successfully');
  })
];

/**
 * Assign driver to order
 */
export const assignDriver = [
  validate(orderIdSchema, 'params'),
  validate(assignDriverSchema),
  catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { driver } = req.body;
    
    const order = await orderService.assignDriver(id as string, driver);
    
    logger.info('Driver assigned to order', { orderId: id, driverId: driver });
    
    return ApiResponse.success(res, order, 'Driver assigned successfully');
  })
];

/**
 * Mark order as delivered
 */
export const markAsDelivered = [
  validate(orderIdSchema, 'params'),
  validate(markAsDeliveredSchema),
  catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { proofOfDelivery, deliveryMessage } = req.body;
    const userId = req.user?.id;
    
    const order = await orderService.getOrderById(id as string);
    console.log('first--', order.driver?.userRef?.id,userId)
    if (order.driver?.userRef?.id !== userId) {
      throw ApiError.forbidden('Only assigned driver can mark order as delivered');
    }
    
    order.status = OrderStatus.DELIVERED;
    order.actualDeliveryDate = new Date();
    if (proofOfDelivery) {
      order.orderSummary.proofOfDelivery = proofOfDelivery;
    }
    if (deliveryMessage) {
      order.orderSummary.deliveryMessage = deliveryMessage;
    }
    
    await order.save();
    
    logger.info('Order marked as delivered', { orderId: id, driverId: userId });
    
    return ApiResponse.success(res, order, 'Order marked as delivered');
  })
];

/**
 * Cancel order
 */
export const cancelOrder = [
  validate(orderIdSchema, 'params'),
  validate(cancelOrderSchema),
  catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user?.id;
    
    if (!userId) {
      throw ApiError.unauthorized('User not authenticated');
    }
    
    const order = await orderService.cancelOrder(id as string, reason, userId);
    
    logger.info('Order cancelled', { orderId: id, userId, reason });
    
    return ApiResponse.success(res, order, 'Order cancelled successfully');
  })
];

/**
 * Initiate refund for order
 */
export const initiateRefund = [
  validate(orderIdSchema, 'params'),
  validate(initiateRefundSchema),
  catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { reason, amount } = req.body;
    const userId = req.user?.id;
    
    const order = await orderService.getOrderById(id as string);
    
    if (order.status !== OrderStatus.DELIVERED && order.status !== OrderStatus.CANCELLED) {
      throw ApiError.badRequest('Can only refund delivered or cancelled orders');
    }
    
    order.status = OrderStatus.REFUNDED;
    order.refundReason = reason;
    
    await order.save();
    
    logger.info('Refund initiated', { orderId: id, userId, reason, amount });
    
    return ApiResponse.success(res, order, 'Refund initiated successfully');
  })
];

/**
 * Add customer review for order
 */
export const addCustomerReview = [
  validate(orderIdSchema, 'params'),
  validate(addReviewSchema),
  catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { rating, review } = req.body;
    const userId = req.user?.id;
    
    if (!userId) {
      throw ApiError.unauthorized('User not authenticated');
    }
    
    const order = await orderService.addCustomerReview(id as string, rating, review, userId);
    
    logger.info('Customer review added', { orderId: id, userId, rating });
    
    return ApiResponse.success(res, order, 'Review added successfully');
  })
];

/**
 * Add driver review for order
 */
export const addDriverReview = [
  validate(orderIdSchema, 'params'),
  validate(addReviewSchema),
  catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { rating, review } = req.body;
    const userId = req.user?.id;
    
    if (!userId) {
      throw ApiError.unauthorized('User not authenticated');
    }
    
    const order = await orderService.addDriverReview(id as string, rating, review, userId);
    
    logger.info('Driver review added', { orderId: id, userId, rating });
    
    return ApiResponse.success(res, order, 'Driver review added successfully');
  })
];

/**
 * Get order statistics
 */
export const getOrderStats = catchAsync(async (req: Request, res: Response) => {
  const { period } = req.query;
  
  const stats = await orderService.getOrderStats(period as any);
  
  return ApiResponse.success(res, stats, 'Order statistics retrieved successfully');
});

/**
 * Get order tracking history
 */
export const getOrderTracking = [
  validate(orderIdSchema, 'params'),
  catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    
    const order = await orderService.getOrderById(id as string);
    
    const tracking = order.trackingHistory || [];
    
    return ApiResponse.success(res, tracking, 'Order tracking retrieved successfully');
  })
];

/**
 * Add unified review for order (customer, driver, and/or seller)
 */
export const addOrderReview = [
  validate(orderIdSchema, 'params'),
  catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { customer, driver, seller } = req.body;
    const userId = req.user?.id;
    const userRole = req.user?.role;
    
    if (!userId) {
      throw ApiError.unauthorized('User not authenticated');
    }
    
    const order = await orderService.getOrderById(id as string);
    
    // Validate that the order is delivered before allowing reviews
    if (order.status !== OrderStatus.DELIVERED) {
      throw ApiError.badRequest('Reviews can only be added for delivered orders');
    }
    
    // Process customer review (from seller or driver)
    if (userRole === 'seller') {
      await orderService.addSellerReview(id as string, seller.rating, seller.review, userId);
      logger.info('Customer review added', { orderId: id, userId, rating: seller.rating });
    }
    
    // Process driver review (from buyer or seller)
    if (userRole === 'driver') {
      await orderService.addDriverReview(id as string, driver.rating, driver.review, userId);
      logger.info('Driver review added', { orderId: id, userId, rating: driver.rating });
    }
    
    // Process seller review (from buyer or driver)
    if (userRole === 'buyer') {
      // Using addCustomerReview as placeholder - should be addSellerReview
      await orderService.addCustomerReview(id as string, customer.rating, customer.review, userId);
      logger.info('Seller review added', { orderId: id, userId, rating: customer.rating });
    }
    
    // Fetch updated order with all reviews
    const updatedOrder = await orderService.getOrderById(id as string);
    
    return ApiResponse.success(res, updatedOrder, 'Reviews added successfully');
  })
];