import { Types, Model } from 'mongoose';
import { IOrder, OrderStatus } from './order.types.js';

export const orderStatics = {
  async findByCustomer(this: Model<IOrder>, customerId: Types.ObjectId): Promise<IOrder[]> {
    return this.find({ customer: customerId })
      .populate('products.product')
      .populate('driver', 'firstName lastName email phone')
      .sort({ createdAt: -1 });
  },

  async findByDriver(this: Model<IOrder>, driverId: Types.ObjectId): Promise<IOrder[]> {
    return this.find({ driver: driverId })
      .populate('products.product')
      .populate('customer', 'firstName lastName email phone')
      .sort({ createdAt: -1 });
  },

  async findBySeller(this: Model<IOrder>, sellerId: Types.ObjectId): Promise<IOrder[]> {
    return this.find({ 'products.seller': sellerId })
      .populate('products.product')
      .populate('customer', 'firstName lastName email phone')
      .populate('driver', 'firstName lastName email phone')
      .sort({ createdAt: -1 });
  },

  async findByStatus(this: Model<IOrder>, status: OrderStatus): Promise<IOrder[]> {
    return this.find({ status })
      .populate('products.product')
      .populate('customer', 'firstName lastName email phone')
      .populate('driver', 'firstName lastName email phone')
      .sort({ createdAt: -1 });
  },

  async findPendingOrders(this: Model<IOrder>): Promise<IOrder[]> {
    return this.find({ 
      status: { $in: [OrderStatus.PENDING, OrderStatus.PROCESSING] } 
    })
      .populate('products.product')
      .populate('customer', 'firstName lastName email phone')
      .sort({ createdAt: -1 });
  },

  async findDeliveredOrders(this: Model<IOrder>, startDate?: Date, endDate?: Date): Promise<IOrder[]> {
    const query: any = { status: OrderStatus.DELIVERED };
    
    if (startDate || endDate) {
      query.actualDeliveryDate = {};
      if (startDate) query.actualDeliveryDate.$gte = startDate;
      if (endDate) query.actualDeliveryDate.$lte = endDate;
    }
    
    return this.find(query)
      .populate('products.product')
      .populate('customer', 'firstName lastName email phone')
      .populate('driver', 'firstName lastName email phone')
      .sort({ actualDeliveryDate: -1 });
  },

  async generateOrderNumber(this: Model<IOrder>): Promise<string> {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    const lastOrder = await this.findOne({
      orderNumber: new RegExp(`^ORD${year}${month}${day}`)
    }).sort({ orderNumber: -1 });
    
    let sequence = 1;
    if (lastOrder) {
      const lastSequence = parseInt(lastOrder.orderNumber.slice(-4));
      sequence = lastSequence + 1;
    }
    
    const orderNumber = `ORD${year}${month}${day}${String(sequence).padStart(4, '0')}`;
    return orderNumber;
  },

  async getOrderStats(this: Model<IOrder>, period?: 'day' | 'week' | 'month' | 'year'): Promise<any> {
    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case 'day':
        startDate.setHours(0, 0, 0, 0);
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
    
    const stats = await this.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$orderSummary.total' },
          averageOrderValue: { $avg: '$orderSummary.total' },
          deliveredOrders: {
            $sum: {
              $cond: [{ $eq: ['$status', OrderStatus.DELIVERED] }, 1, 0],
            },
          },
          cancelledOrders: {
            $sum: {
              $cond: [{ $eq: ['$status', OrderStatus.CANCELLED] }, 1, 0],
            },
          },
          pendingOrders: {
            $sum: {
              $cond: [{ $eq: ['$status', OrderStatus.PENDING] }, 1, 0],
            },
          },
          processingOrders: {
            $sum: {
              $cond: [{ $eq: ['$status', OrderStatus.PROCESSING] }, 1, 0],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          totalOrders: 1,
          totalRevenue: { $round: ['$totalRevenue', 2] },
          averageOrderValue: { $round: ['$averageOrderValue', 2] },
          deliveredOrders: 1,
          cancelledOrders: 1,
          pendingOrders: 1,
          processingOrders: 1,
          deliveryRate: {
            $multiply: [
              { $divide: ['$deliveredOrders', '$totalOrders'] },
              100,
            ],
          },
          cancellationRate: {
            $multiply: [
              { $divide: ['$cancelledOrders', '$totalOrders'] },
              100,
            ],
          },
        },
      },
    ]);
    
    return stats[0] || {
      totalOrders: 0,
      totalRevenue: 0,
      averageOrderValue: 0,
      deliveredOrders: 0,
      cancelledOrders: 0,
      pendingOrders: 0,
      processingOrders: 0,
      deliveryRate: 0,
      cancellationRate: 0,
    };
  },

  async searchOrders(this: Model<IOrder>, query: string): Promise<IOrder[]> {
    return this.find({
      $or: [
        { orderNumber: new RegExp(query, 'i') },
        { 'products.name': new RegExp(query, 'i') },
        { 'shippingAddress.name': new RegExp(query, 'i') },
        { 'shippingAddress.city': new RegExp(query, 'i') },
        { notes: new RegExp(query, 'i') },
      ],
    })
      .populate('products.product')
      .populate('customer', 'firstName lastName email phone')
      .populate('driver', 'firstName lastName email phone')
      .sort({ createdAt: -1 })
      .limit(50);
  },
};