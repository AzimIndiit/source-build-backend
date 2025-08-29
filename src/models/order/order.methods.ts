import { Types } from 'mongoose';
import { IOrderMethods, IOrder, OrderStatus, IOrderTracking } from './order.types.js';
import logger from '@config/logger.js';

export const orderMethods: IOrderMethods = {
  calculateTotal: function(this: IOrder): number {
    const subtotal = this.products.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const total = 
      subtotal + 
      this.orderSummary.shippingFee + 
      this.orderSummary.marketplaceFee + 
      this.orderSummary.taxes - 
      (this.orderSummary.discount || 0);
    return total;
  },

  updateStatus: async function(
    this: IOrder, 
    status: OrderStatus, 
    updatedBy?: Types.ObjectId
  ): Promise<IOrder> {
    this.status = status;
    
    const tracking: IOrderTracking = {
      status,
      timestamp: new Date(),
      description: `Order status updated to ${status}`,
      updatedBy,
    } as IOrderTracking;
    
    this.trackingHistory.push(tracking);
    
    if (status === OrderStatus.DELIVERED) {
      this.actualDeliveryDate = new Date();
    }
    
    await this.save();
    
    logger.info('Order status updated', { 
      orderId: this._id, 
      status,
      updatedBy 
    });
    
    return this;
  },

  assignDriver: async function(
    this: IOrder, 
    driverId: Types.ObjectId
  ): Promise<IOrder> {
    this.driver = driverId;
    
    const tracking: IOrderTracking = {
      status: this.status,
      timestamp: new Date(),
      description: 'Driver assigned to order',
      updatedBy: driverId,
    } as IOrderTracking;
    
    this.trackingHistory.push(tracking);
    
    await this.save();
    
    logger.info('Driver assigned to order', { 
      orderId: this._id, 
      driverId 
    });
    
    return this;
  },

  markAsDelivered: async function(
    this: IOrder, 
    proofOfDelivery?: string
  ): Promise<IOrder> {
    this.status = OrderStatus.DELIVERED;
    this.actualDeliveryDate = new Date();
    
    if (proofOfDelivery) {
      this.proofOfDelivery = proofOfDelivery;
    }
    
    const tracking: IOrderTracking = {
      status: OrderStatus.DELIVERED,
      timestamp: new Date(),
      description: 'Order delivered successfully',
      updatedBy: this.driver,
    } as IOrderTracking;
    
    this.trackingHistory.push(tracking);
    
    await this.save();
    
    logger.info('Order marked as delivered', { 
      orderId: this._id,
      proofOfDelivery: !!proofOfDelivery 
    });
    
    return this;
  },

  cancelOrder: async function(
    this: IOrder, 
    reason: string, 
    updatedBy?: Types.ObjectId
  ): Promise<IOrder> {
    if (this.status === OrderStatus.DELIVERED) {
      throw new Error('Cannot cancel a delivered order');
    }
    
    this.status = OrderStatus.CANCELLED;
    this.cancelReason = reason;
    
    const tracking: IOrderTracking = {
      status: OrderStatus.CANCELLED,
      timestamp: new Date(),
      description: `Order cancelled: ${reason}`,
      updatedBy,
    } as IOrderTracking;
    
    this.trackingHistory.push(tracking);
    
    await this.save();
    
    logger.info('Order cancelled', { 
      orderId: this._id, 
      reason,
      updatedBy 
    });
    
    return this;
  },

  initiateRefund: async function(
    this: IOrder, 
    reason: string
  ): Promise<IOrder> {
    if (this.status !== OrderStatus.CANCELLED && this.status !== OrderStatus.DELIVERED) {
      throw new Error('Can only refund cancelled or delivered orders');
    }
    
    this.status = OrderStatus.REFUNDED;
    this.refundReason = reason;
    this.paymentDetails.status = 'refunded' as any;
    
    const tracking: IOrderTracking = {
      status: OrderStatus.REFUNDED,
      timestamp: new Date(),
      description: `Refund initiated: ${reason}`,
    } as IOrderTracking;
    
    this.trackingHistory.push(tracking);
    
    await this.save();
    
    logger.info('Refund initiated for order', { 
      orderId: this._id, 
      reason 
    });
    
    return this;
  },

  addCustomerReview: async function(
    this: IOrder, 
    rating: number, 
    review: string
  ): Promise<IOrder> {
    if (this.status !== OrderStatus.DELIVERED) {
      throw new Error('Can only review delivered orders');
    }
    
    this.customerReview = {
      rating,
      review,
      reviewedAt: new Date(),
    };
    
    await this.save();
    
    logger.info('Customer review added', { 
      orderId: this._id, 
      rating 
    });
    
    return this;
  },

  addDriverReview: async function(
    this: IOrder, 
    rating: number, 
    review: string
  ): Promise<IOrder> {
    if (this.status !== OrderStatus.DELIVERED) {
      throw new Error('Can only review delivered orders');
    }
    
    if (!this.driver) {
      throw new Error('No driver assigned to this order');
    }
    
    this.driverReview = {
      rating,
      review,
      reviewedAt: new Date(),
    };
    
    await this.save();
    
    logger.info('Driver review added', { 
      orderId: this._id, 
      rating 
    });
    
    return this;
  },

  getTrackingInfo: function(this: IOrder): IOrderTracking[] {
    return this.trackingHistory.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  },

  sendNotification: async function(
    this: IOrder, 
    type: string
  ): Promise<void> {
    logger.info('Sending notification for order', { 
      orderId: this._id, 
      type,
      customer: this.customer 
    });
  },
};