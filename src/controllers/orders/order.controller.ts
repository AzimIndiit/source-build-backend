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
  OrderFilterInput,
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
    const filters: OrderFilterInput = req.query as any;
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
  validate(orderIdSchema, 'params'),
  catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    
    const order = await orderService.getOrderById(id);
    
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
    
    const order = await orderService.getOrderById(orderNumber);
    
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
    
    const order = await orderService.getOrderById(id);
    
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
    
    const order = await orderService.updateOrderStatus(id, status, userId);
    
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
    
    const order = await orderService.assignDriver(id, driver);
    
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
    const { proofOfDelivery } = req.body;
    const userId = req.user?.id;
    
    const order = await orderService.getOrderById(id);
    
    if (order.driver?.userRef?.toString() !== userId) {
      throw ApiError.forbidden('Only assigned driver can mark order as delivered');
    }
    
    order.status = OrderStatus.DELIVERED;
    order.actualDeliveryDate = new Date();
    if (proofOfDelivery) {
      order.orderSummary.proofOfDelivery = proofOfDelivery;
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
    
    const order = await orderService.cancelOrder(id, reason, userId);
    
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
    
    const order = await orderService.getOrderById(id);
    
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
    
    const order = await orderService.addCustomerReview(id, rating, review, userId);
    
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
    
    const order = await orderService.addDriverReview(id, rating, review, userId);
    
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
    
    const order = await orderService.getOrderById(id);
    
    const tracking = order.trackingHistory || [];
    
    return ApiResponse.success(res, tracking, 'Order tracking retrieved successfully');
  })
];