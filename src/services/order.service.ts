import { Types } from 'mongoose';
import OrderModal from '@models/order/index.js';
import ProductModal from '@models/product/product.model.js';
import UserModal from '@models/user/user.model.js';
import ApiError from '@utils/ApiError.js';
import logger from '@config/logger.js';
import {
  IOrder,
  OrderStatus,
  PaymentStatus,
  CreateOrderDTO,
  UpdateOrderDTO,
  OrderFilterDTO,
  ICustomerInfo,
  IDriverInfo,
  IOrderProduct,
  ISellerInfo,
} from '@models/order/order.types.js';

class OrderService {
  async createOrder(orderData: any, userId: string): Promise<IOrder> {
    try {
      const user = await UserModal.findById(userId);
      if (!user) {
        throw ApiError.notFound('User not found');
      }

      const customerInfo: ICustomerInfo = {
        userRef: user._id as any,
      };

      const productIds = orderData.products.map((p: any) => p.productRef || p.id);
      const products = await ProductModal.find({ _id: { $in: productIds } });
      
      if (products.length !== productIds.length) {
        throw ApiError.badRequest('One or more products not found');
      }

      const orderProducts: IOrderProduct[] = orderData.products.map((item: any) => {
        const product = products.find(p => 
          p._id.toString() === (item.productRef || item.id)
        );
        if (!product) {
          throw ApiError.badRequest(`Product ${item.productRef || item.id} not found`);
        }
        
        return {
          id: item.id || product._id.toString(),
          title: item.title || product.title,
          price: item.price || product.price,
          quantity: item.quantity,
          image: item.image || product.images?.[0],
          deliveryDate: item.deliveryDate,
          productRef: product._id,
          seller: product.seller,
        };
      });

      const subTotal = orderProducts.reduce(
        (sum, item) => sum + (item.price * item.quantity), 
        0
      );
      const shippingFee = orderData.orderSummary?.shippingFee || 10;
      const marketplaceFee = orderData.orderSummary?.marketplaceFee || (subTotal * 0.1);
      const taxes = orderData.orderSummary?.taxes || (subTotal * 0.08);
      const total = subTotal + shippingFee + marketplaceFee + taxes;

      const sellerInfo : ISellerInfo = {
        userRef: orderProducts[0].seller,
      };

      const order = await OrderModal.create({
        customer: customerInfo,
        seller: sellerInfo,
        products: orderProducts,
        date: new Date().toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric', 
          year: 'numeric' 
        }),
        amount: total,
        status: OrderStatus.PENDING,
        orderSummary: {
          shippingAddress: orderData.orderSummary.shippingAddress,
          paymentMethod: orderData.orderSummary.paymentMethod,
          subTotal,
          shippingFee,
          marketplaceFee,
          taxes,
          total,
        },
        deliveryInstructions: orderData.deliveryInstructions,
        notes: orderData.notes,
        estimatedDeliveryDate: orderData.estimatedDeliveryDate,
      });

      await order.populate('customer.userRef', 'firstName lastName email phone avatar');
      
      logger.info(`Order created: ${order.orderNumber || order._id}`);
      return order;
    } catch (error) {
      logger.error('Error creating order:', error);
      throw error;
    }
  }

  async getOrders(filters: OrderFilterDTO, userId?: string, userRole?: string): Promise<{
    orders: IOrder[];
    pagination: any;
  }> {
    try {
      const query: any = {};
      const page = filters.page || 1;
      const limit = filters.limit || 10;
      const skip = (page - 1) * limit;

      if (filters.status) query.status = filters.status;
      if (filters.customer) query['customer.userRef'] = filters.customer;
      if (filters.driver) query['driver.userRef'] = filters.driver;
      if (filters.seller) query['seller.userRef'] = filters.seller;

      // Build date filter object separately to avoid mutation issues
      const dateFilter: any = {};
      if (filters.startDate) {
        const startDateStr = typeof filters.startDate === 'string' ? filters.startDate : filters.startDate.toISOString();
        // If date string is in YYYY-MM-DD format, parse it as local date
        if (startDateStr.length === 10) { // YYYY-MM-DD format
          // Parse as UTC date at start of day to avoid timezone issues
          dateFilter.$gte = new Date(startDateStr + 'T00:00:00.000Z');
        } else {
          // Handle full datetime strings
          dateFilter.$gte = new Date(startDateStr);
        }
      }
      if (filters.endDate) {
        const endDateStr = typeof filters.endDate === 'string' ? filters.endDate : filters.endDate.toISOString();
        // If date string is in YYYY-MM-DD format, parse it as local date
        if (endDateStr.length === 10) { // YYYY-MM-DD format
          // Parse as UTC date at end of day to avoid timezone issues
          dateFilter.$lte = new Date(endDateStr + 'T23:59:59.999Z');
        } else {
          // Handle full datetime strings
          dateFilter.$lte = new Date(endDateStr);
        }
      }
      
      // Only add createdAt filter if we have date filters
      if (Object.keys(dateFilter).length > 0) {
        query.createdAt = dateFilter;
      }

      if (filters.minAmount || filters.maxAmount) {
        query.amount = {};
        if (filters.minAmount) query.amount.$gte = filters.minAmount;
        if (filters.maxAmount) query.amount.$lte = filters.maxAmount;
      }

      if (filters.search) {
        query.$or = [
          { orderNumber: { $regex: filters.search, $options: 'i' } },
          { 'products.title': { $regex: filters.search, $options: 'i' } },
        ];
      }

      if (userRole === 'buyer' && userId) {
        query['customer.userRef'] = userId;
      } else if (userRole === 'driver' && userId) {
        query['driver.userRef'] = userId;
      } else if (userRole === 'seller' && userId) {
        query['seller.userRef'] = userId;
      }

      const sort: any = {};
      if (filters.sort) {
        // Handle MongoDB-style sort parameter (e.g., "-createdAt" or "amount")
        if (filters.sort.startsWith('-')) {
          sort[filters.sort.substring(1)] = -1; // Descending
        } else if (filters.sort.includes(':')) {
          // Legacy format support
          const [field, order] = filters.sort.split(':');
          sort[field] = order === 'desc' ? -1 : 1;
        } else {
          sort[filters.sort] = 1; // Ascending
        }
      } else {
        sort.createdAt = -1;
      }
      // Debug logging for query construction
      logger.debug('MongoDB query constructed:', {
        driver: query['driver.userRef'],
        createdAt: query.createdAt,
        status: query.status,
        seller: query['seller.userRef'],
        customer: query['customer.userRef']
      });
      
      const [orders, total] = await Promise.all([
        OrderModal.find(query)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .populate('customer.userRef', 'displayName email phone avatar')
          .populate('driver.userRef', 'displayName email phone avatar')
           .populate('seller.userRef', 'displayName email phone avatar')
          .populate('products.productRef', 'title price images'),
        OrderModal.countDocuments(query),
      ]);
      
      logger.debug(`Query results: Found ${orders.length} orders out of ${total} total matching the query`);
      const totalPages = Math.ceil(total / limit);

      return {
        orders,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      logger.error('Error fetching orders:', error);
      throw error;
    }
  }

  async getOrderById(orderId: string): Promise<IOrder> {
    try {
      let order: IOrder | null = null;
      
      // Check if orderId is a valid ObjectId
      if (orderId.match(/^[0-9a-fA-F]{24}$/)) {
        // It's a valid ObjectId format, try to find by _id first
        order = await OrderModal.findById(orderId)
          .populate('customer.userRef', 'displayName email phone avatar')
          .populate('driver.userRef', 'displayName email phone avatar')
          .populate('seller.userRef', 'displayName email phone avatar')
          .populate('products.productRef', 'title price images slug');
      }
      
      // If not found by _id or not a valid ObjectId, try by orderNumber
      if (!order) {
        order = await OrderModal.findOne({ orderNumber: orderId })
          .populate('customer.userRef', 'displayName email phone avatar')
          .populate('driver.userRef', 'displayName email phone avatar')
          .populate('seller.userRef', 'displayName email phone avatar')
          .populate('products.productRef', 'title price images slug');
      }

      if (!order) {
        throw ApiError.notFound('Order not found');
      }

      return order;
    } catch (error) {
      logger.error('Error fetching order:', error);
      throw error;
    }
  }

  async updateOrderStatus(orderId: string, status: OrderStatus, userId?: string): Promise<IOrder> {
    try {
      const order = await this.getOrderById(orderId);
      
      const validTransitions: Record<OrderStatus, OrderStatus[]> = {
        [OrderStatus.PENDING]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
        [OrderStatus.PROCESSING]: [OrderStatus.IN_TRANSIT, OrderStatus.CANCELLED],
        [OrderStatus.IN_TRANSIT]: [OrderStatus.OUT_FOR_DELIVERY, OrderStatus.CANCELLED],
        [OrderStatus.OUT_FOR_DELIVERY]: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
        [OrderStatus.DELIVERED]: [OrderStatus.REFUNDED],
        [OrderStatus.CANCELLED]: [],
        [OrderStatus.REFUNDED]: [],
      };

      if (!validTransitions[order.status]?.includes(status)) {
        throw ApiError.badRequest(`Cannot transition from ${order.status} to ${status}`);
      }

      order.status = status;
      
      if (status === OrderStatus.DELIVERED) {
        order.actualDeliveryDate = new Date();
      }

      await order.save();
      
      logger.info(`Order ${orderId} status updated to ${status}`);
      return order;
    } catch (error) {
      logger.error('Error updating order status:', error);
      throw error;
    }
  }

  async assignDriver(orderId: string, driverId: string): Promise<IOrder> {
    try {
      const [order, driver] = await Promise.all([
        this.getOrderById(orderId),
        UserModal.findById(driverId),
      ]);

      if (!driver) {
        throw ApiError.notFound('Driver not found');
      }

      const driverInfo: IDriverInfo = {
        userRef: driver._id as any,
      };

      order.driver = driverInfo;
      await order.save();
      
      logger.info(`Driver ${driverId} assigned to order ${orderId}`);
      return order;
    } catch (error) {
      logger.error('Error assigning driver:', error);
      throw error;
    }
  }

  async cancelOrder(orderId: string, reason: string, userId: string): Promise<IOrder> {
    try {
      const order = await this.getOrderById(orderId);
      
      if (order.status === OrderStatus.DELIVERED) {
        throw ApiError.badRequest('Cannot cancel a delivered order');
      }
      
      if (order.status === OrderStatus.CANCELLED) {
        throw ApiError.badRequest('Order is already cancelled');
      }

      order.status = OrderStatus.CANCELLED;
      order.cancelReason = reason;
      await order.save();
      
      logger.info(`Order ${orderId} cancelled by user ${userId}`);
      return order;
    } catch (error) {
      logger.error('Error cancelling order:', error);
      throw error;
    }
  }

  async getOrderStats(period?: 'day' | 'week' | 'month' | 'year'): Promise<any> {
    try {
      const now = new Date();
      let startDate = new Date();

      switch (period) {
        case 'day':
          startDate.setDate(now.getDate() - 1);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
        default:
          startDate = new Date(0);
      }

      const stats = await OrderModal.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalRevenue: { $sum: '$amount' },
            averageOrderValue: { $avg: '$amount' },
            statusCounts: {
              $push: '$status',
            },
          },
        },
        {
          $project: {
            _id: 0,
            totalOrders: 1,
            totalRevenue: { $round: ['$totalRevenue', 2] },
            averageOrderValue: { $round: ['$averageOrderValue', 2] },
            statusBreakdown: {
              $arrayToObject: {
                $map: {
                  input: { $setUnion: ['$statusCounts', []] },
                  as: 'status',
                  in: {
                    k: '$$status',
                    v: {
                      $size: {
                        $filter: {
                          input: '$statusCounts',
                          cond: { $eq: ['$$this', '$$status'] },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      ]);

      return stats[0] || {
        totalOrders: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
        statusBreakdown: {},
      };
    } catch (error) {
      logger.error('Error fetching order stats:', error);
      throw error;
    }
  }

  async addCustomerReview(
    orderId: string, 
    rating: number, 
    review: string, 
    userId: string
  ): Promise<IOrder> {
    try {
      const order = await this.getOrderById(orderId);
      
  
      if (order.status !== OrderStatus.DELIVERED) {
        throw ApiError.badRequest('Can only review delivered orders');
      }

      // Update order with embedded review
      if (order.customer) {
        order.customer.reviewRef = {
          rating,
          review,
          reviewedAt: new Date(),
        };
        await order.save();
      }
      
      logger.info(`Customer review added to order ${orderId}`);
      return order;
    } catch (error) {
      logger.error('Error adding customer review:', error);
      throw error;
    }
  }

  async addDriverReview(
    orderId: string, 
    rating: number, 
    review: string, 
    userId: string
  ): Promise<IOrder> {
    try {
      const order = await this.getOrderById(orderId);
      
  
      
      if (!order.driver) {
        throw ApiError.badRequest('No driver assigned to this order');
      }
      
      if (order.status !== OrderStatus.DELIVERED) {
        throw ApiError.badRequest('Can only review delivered orders');
      }

      // Update order with embedded review
      if (order.driver) {
        order.driver.reviewRef = {
          rating,
          review,
          reviewedAt: new Date(),
        };
        await order.save();
      }
      
      logger.info(`Driver review added to order ${orderId}`);
      return order;
    } catch (error) {
      logger.error('Error adding driver review:', error);
      throw error;
    }
  }
  async addSellerReview(
    orderId: string, 
    rating: number, 
    review: string, 
    userId: string
  ): Promise<IOrder> {
    try {
      const order = await this.getOrderById(orderId);
      
   
      if (!order.seller) {
        throw ApiError.badRequest('No seller assigned to this order');
      }
      
      if (order.status !== OrderStatus.DELIVERED) {
        throw ApiError.badRequest('Can only review delivered orders');
      }

      // Update order with embedded review
      if (order.seller) {
        order.seller.reviewRef = {
          rating,
          review,
          reviewedAt: new Date(),
        };
        await order.save();
      }
      
      logger.info(`Seller review added to order ${orderId}`);
      return order;
    } catch (error) {
      logger.error('Error adding seller review:', error);
      throw error;
    }
  }
}

export default new OrderService();