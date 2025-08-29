import { Request, Response } from 'express';
import { Types } from 'mongoose';
import catchAsync from '@utils/catchAsync.js';
import ApiResponse from '@utils/ApiResponse.js';
import ApiError from '@utils/ApiError.js';
import OrderModal from '@models/order/index.js';
import ProductModal from '@models/product/product.model.js';
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
import { OrderStatus, PaymentStatus } from '@models/order/order.types.js';
import { IOrder } from '@models/order/order.types.js';

// Helper function to cast order to proper type with methods
const castOrder = (order: any): IOrder => order as IOrder;

/**
 * Create a new order
 */
export const createOrder = [
  validate(createOrderSchema),
  catchAsync(async (req: Request, res: Response) => {
    const orderData: CreateOrderInput = req.body;
    
    // Set customer from authenticated user
    const customerId = req.user?.id;
    
    if (!customerId) {
      throw ApiError.unauthorized('User not authenticated');
    }
    
    // Validate and populate product details
    const productIds = orderData.products.map(p => p.product);
    const products = await ProductModal.find({ _id: { $in: productIds } });
    
    if (products.length !== productIds.length) {
      throw ApiError.badRequest('One or more products not found');
    }
    
    // Prepare order products with current prices and seller info
    const orderProducts = orderData.products.map(item => {
      const product = products.find(p => p._id.toString() === item.product);
      if (!product) {
        throw ApiError.badRequest(`Product ${item.product} not found`);
      }
      
      return {
        product: product._id,
        name: product.title,
        price: item.price || product.price,
        quantity: item.quantity,
        image: product.images?.[0],
        seller: product.seller,
      };
    });
    
    // Calculate order summary
    const subtotal = orderProducts.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shippingFee = 10; // Could be dynamic based on location
    const marketplaceFee = subtotal * 0.1; // 10% marketplace fee
    const taxes = subtotal * 0.08; // 8% tax
    const total = subtotal + shippingFee + marketplaceFee + taxes;
    
    // Create the order
    const order = await OrderModal.create({
      customer: customerId,
      products: orderProducts,
      shippingAddress: orderData.shippingAddress,
      billingAddress: orderData.billingAddress || orderData.shippingAddress,
      paymentDetails: {
        method: orderData.paymentMethod,
        status: PaymentStatus.PENDING,
      },
      orderSummary: {
        subtotal,
        shippingFee,
        marketplaceFee,
        taxes,
        total,
      },
      deliveryInstructions: orderData.deliveryInstructions,
      notes: orderData.notes,
      estimatedDeliveryDate: orderData.estimatedDeliveryDate,
    });
    
    await order.populate([
      { path: 'customer', select: 'firstName lastName email phone' },
      { path: 'products.product', select: 'title price images' },
    ]);
    
    logger.info('Order created', { orderId: order._id, customerId });
    
    return ApiResponse.created(res, order, 'Order created successfully');
  })
];

/**
 * Get all orders with filters
 */
export const getOrders = [
  validate(orderFilterSchema),
  catchAsync(async (req: Request, res: Response) => {
    const query: OrderFilterInput = req.query as any;
    const userId = req.user?.id;
    const userRole = req.user?.role;
    
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;
    
    const filter: any = {};
    
    // Role-based filtering
    if (userRole === 'seller') {
      filter['products.seller'] = userId;
    } else if (userRole === 'driver') {
      filter.driver = userId;
    } else if (userRole === 'buyer') {
      filter.customer = userId;
    }
    
    // Apply additional filters
    if (query.status) filter.status = query.status;
    if (query.customer) filter.customer = query.customer;
    if (query.driver) filter.driver = query.driver;
    if (query.paymentMethod) filter['paymentDetails.method'] = query.paymentMethod;
    if (query.paymentStatus) filter['paymentDetails.status'] = query.paymentStatus;
    
    if (query.startDate || query.endDate) {
      filter.createdAt = {};
      if (query.startDate) filter.createdAt.$gte = new Date(query.startDate);
      if (query.endDate) filter.createdAt.$lte = new Date(query.endDate);
    }
    
    if (query.minAmount || query.maxAmount) {
      filter['orderSummary.total'] = {};
      if (query.minAmount) filter['orderSummary.total'].$gte = query.minAmount;
      if (query.maxAmount) filter['orderSummary.total'].$lte = query.maxAmount;
    }
    
    if (query.search) {
      filter.$or = [
        { orderNumber: { $regex: query.search, $options: 'i' } },
        { 'products.name': { $regex: query.search, $options: 'i' } },
        { 'shippingAddress.name': { $regex: query.search, $options: 'i' } },
      ];
    }
    
    let sortOptions: any = { createdAt: -1 };
    if (query.sort) {
      const sortFields = query.sort.split(',');
      sortOptions = {};
      sortFields.forEach(field => {
        const order = field.startsWith('-') ? -1 : 1;
        const fieldName = field.replace(/^-/, '');
        sortOptions[fieldName] = order;
      });
    }
    
    const [orders, total] = await Promise.all([
      OrderModal.find(filter)
        .populate('customer', 'firstName lastName email phone')
        .populate('driver', 'firstName lastName email phone')
        .populate('products.product', 'title price images')
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean(),
      OrderModal.countDocuments(filter),
    ]);
    
    const totalPages = Math.ceil(total / limit);
    
    return ApiResponse.successWithPagination(
      res,
      orders,
      {
        page,
        limit,
        total,
        pages: totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      'Orders retrieved successfully'
    );
  })
];

/**
 * Get single order by ID
 */
export const getOrder = [
  validate(orderIdSchema),
  catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role;
    
    if (!Types.ObjectId.isValid(id as string)) {
      throw ApiError.badRequest('Invalid order ID');
    }
    
    const order = await OrderModal.findById(id as string)
      .populate('customer', 'firstName lastName email phone avatar')
      .populate('driver', 'firstName lastName email phone avatar')
      .populate('products.product', 'title price images description');
    
    if (!order) {
      throw ApiError.notFound('Order not found');
    }
    
    // Check access permissions
    const hasAccess = 
      userRole === 'admin' ||
      order.customer.toString() === userId ||
      order.driver?.toString() === userId ||
      order.products.some(p => p.seller?.toString() === userId);
    
    if (!hasAccess) {
      throw ApiError.forbidden('You are not authorized to view this order');
    }
    
    return ApiResponse.success(res, order, 'Order retrieved successfully');
  })
];

/**
 * Get order by order number
 */
export const getOrderByNumber = [
  validate(orderNumberSchema),
  catchAsync(async (req: Request, res: Response) => {
    const { orderNumber } = req.params;
    
    const order = await OrderModal.findOne({ orderNumber })
      .populate('customer', 'firstName lastName email phone avatar')
      .populate('driver', 'firstName lastName email phone avatar')
      .populate('products.product', 'title price images description');
    
    if (!order) {
      throw ApiError.notFound('Order not found');
    }
    
    return ApiResponse.success(res, order, 'Order retrieved successfully');
  })
];

/**
 * Update order details
 */
export const updateOrder = [
  validate(updateOrderSchema),
  catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const updateData: UpdateOrderInput = req.body;
    const userId = req.user?.id;
    const userRole = req.user?.role;
    
    if (!Types.ObjectId.isValid(id as string)) {
      throw ApiError.badRequest('Invalid order ID');
    }
    
    const order = await OrderModal.findById(id as string);
    
    if (!order) {
      throw ApiError.notFound('Order not found');
    }
    
    // Check permissions
    const canUpdate = 
      userRole === 'admin' ||
      (userRole === 'seller' && order.products.some(p => p.seller?.toString() === userId));
    
    if (!canUpdate) {
      throw ApiError.forbidden('You are not authorized to update this order');
    }
    
    Object.assign(order, updateData);
    await order.save();
    
    await order.populate([
      { path: 'customer', select: 'firstName lastName email phone' },
      { path: 'driver', select: 'firstName lastName email phone' },
      { path: 'products.product', select: 'title price images' },
    ]);
    
    logger.info('Order updated', { orderId: order._id, updatedBy: userId });
    
    return ApiResponse.success(res, order, 'Order updated successfully');
  })
];

/**
 * Update order status
 */
export const updateOrderStatus = [
  validate(updateOrderStatusSchema),
  catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status, reason, location } = req.body;
    const userId = req.user?.id;
    
    if (!Types.ObjectId.isValid(id as string)) {
      throw ApiError.badRequest('Invalid order ID');
    }
    
    const order = await OrderModal.findById(id as string);
    
    if (!order) {
      throw ApiError.notFound('Order not found');
    }
    
    await order.updateStatus(status, new Types.ObjectId(userId));
    
    if (location) {
      order.trackingHistory[order.trackingHistory.length - 1]!.location = location;
    }
    if (reason) {
      order.trackingHistory[order.trackingHistory.length - 1]!.description = reason;
    }
    
    await order.save();
    
    await order.populate([
      { path: 'customer', select: 'firstName lastName email phone' },
      { path: 'driver', select: 'firstName lastName email phone' },
    ]);
    
    logger.info('Order status updated', { orderId: order._id, status, updatedBy: userId });
    
    return ApiResponse.success(res, order, 'Order status updated successfully');
  })
];

/**
 * Assign driver to order
 */
export const assignDriver = [
  validate(assignDriverSchema),
  catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { driver } = req.body;
    
    if (!Types.ObjectId.isValid(id as string)) {
      throw ApiError.badRequest('Invalid order ID');
    }
    
    const order = await OrderModal.findById(id as string);
    
    if (!order) {
      throw ApiError.notFound('Order not found');
    }
    
    if (order.status !== OrderStatus.PENDING && order.status !== OrderStatus.PROCESSING) {
      throw ApiError.badRequest('Cannot assign driver to this order status');
    }
    
    await order.assignDriver(new Types.ObjectId(driver));
    
    await order.populate('driver', 'firstName lastName email phone');
    
    logger.info('Driver assigned to order', { orderId: order._id, driverId: driver });
    
    return ApiResponse.success(res, order, 'Driver assigned successfully');
  })
];

/**
 * Mark order as delivered
 */
export const markAsDelivered = [
  validate(markAsDeliveredSchema),
  catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { proofOfDelivery } = req.body;
    const userId = req.user?.id;
    
    if (!Types.ObjectId.isValid(id as string  )) {
      throw ApiError.badRequest('Invalid order ID');
    }
    
    const order = await OrderModal.findById(id as string);
    
    if (!order) {
      throw ApiError.notFound('Order not found');
    }
    
    // Only driver can mark as delivered
    if (order.driver?.toString() !== userId) {
      throw ApiError.forbidden('Only assigned driver can mark order as delivered');
    }
    
    await order.markAsDelivered(proofOfDelivery);
    
    logger.info('Order marked as delivered', { orderId: order._id, driverId: userId });
    
    return ApiResponse.success(res, order, 'Order delivered successfully');
  })
];

/**
 * Cancel order
 */
export const cancelOrder = [
  validate(cancelOrderSchema),
  catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user?.id;
    
    if (!Types.ObjectId.isValid(id as string)) {
      throw ApiError.badRequest('Invalid order ID');
    }
    
    const order = await OrderModal.findById(id as string);
    
    if (!order) {
      throw ApiError.notFound('Order not found');
    }
    
    // Check if user can cancel
    const canCancel = 
      order.customer.toString() === userId ||
      req.user?.role === 'admin';
    
    if (!canCancel) {
      throw ApiError.forbidden('You are not authorized to cancel this order');
    }
    
    await order.cancelOrder(reason, new Types.ObjectId(userId));
    
    logger.info('Order cancelled', { orderId: order._id, reason, cancelledBy: userId });
    
    return ApiResponse.success(res, order, 'Order cancelled successfully');
  })
];

/**
 * Initiate refund
 */
export const initiateRefund = [
  validate(initiateRefundSchema),
  catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { reason } = req.body;
    
    if (!Types.ObjectId.isValid(id as string)) {
      throw ApiError.badRequest('Invalid order ID');
    }
    
    const order = await OrderModal.findById(id as string);
    
    if (!order) {
      throw ApiError.notFound('Order not found');
    }
    
    await order.initiateRefund(reason);
    
    logger.info('Refund initiated', { orderId: order._id, reason });
    
    return ApiResponse.success(res, order, 'Refund initiated successfully');
  })
];

/**
 * Add customer review
 */
export const addCustomerReview = [
  validate(addReviewSchema),
  catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { rating, review } = req.body;
    const userId = req.user?.id;
    
    if (!Types.ObjectId.isValid(id as string)) {
      throw ApiError.badRequest('Invalid order ID');
    }
    
    const order = await OrderModal.findById(id as string);
    
    if (!order) {
      throw ApiError.notFound('Order not found');
    }
    
    if (order.customer.toString() !== userId as string) {
      throw ApiError.forbidden('Only customer can review this order');
    }
    
    await order.addCustomerReview(rating, review);
    
    logger.info('Customer review added', { orderId: order._id, rating });
    
    return ApiResponse.success(res, order, 'Review added successfully');
  })
];

/**
 * Add driver review
 */
export const addDriverReview = [
  validate(addReviewSchema),
  catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { rating, review } = req.body;
    const userId = req.user?.id;
    
    if (!Types.ObjectId.isValid(id as string)) {
      throw ApiError.badRequest('Invalid order ID');
    }
    
    const order = await OrderModal.findById(id as string);
    
    if (!order) {
      throw ApiError.notFound('Order not found');
    }
    
    if (order.customer.toString() !== userId) {
      throw ApiError.forbidden('Only customer can review the driver');
    }
    
    await order.addDriverReview(rating, review);
    
    logger.info('Driver review added', { orderId: order._id, rating });
    
    return ApiResponse.success(res, order, 'Driver review added successfully');
  })
];

/**
 * Get order statistics
 */
export const getOrderStats = catchAsync(async (req: Request, res: Response) => {
  const { period } = req.query;
  const userId = req.user?.id;
  const userRole = req.user?.role;
  
  let stats;
  
  if (userRole === 'admin') {
    stats = await OrderModal.getOrderStats(period as any);
  } else if (userRole === 'seller') {
    // Get seller-specific stats
    const orders = await OrderModal.findBySeller(new Types.ObjectId(userId));
    stats = {
      totalOrders: orders.length,
      pendingOrders: orders.filter(o => o.status === OrderStatus.PENDING).length,
      processingOrders: orders.filter(o => o.status === OrderStatus.PROCESSING).length,
      deliveredOrders: orders.filter(o => o.status === OrderStatus.DELIVERED).length,
      cancelledOrders: orders.filter(o => o.status === OrderStatus.CANCELLED).length,
    };
  } else {
    throw ApiError.forbidden('Not authorized to view statistics');
  }
  
  return ApiResponse.success(res, stats, 'Order statistics retrieved successfully');
});

/**
 * Get order tracking history
 */
export const getOrderTracking = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  if (!Types.ObjectId.isValid(id as string)) {
    throw ApiError.badRequest('Invalid order ID');
  }
  
  const order = await OrderModal.findById(id as string);
  
  if (!order) {
    throw ApiError.notFound('Order not found');
  }
  
  const tracking = order.getTrackingInfo();
  
  return ApiResponse.success(res, tracking, 'Tracking information retrieved successfully');
});

export default {
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
};