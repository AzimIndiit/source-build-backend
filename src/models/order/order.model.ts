import { Schema, model } from 'mongoose';
import { 
  IOrder, 
  IOrderModel,
  OrderStatus,
  PaymentStatus
} from './order.types.js';
import {
  ShippingAddressSchema,
  OrderProductSchema,
  PaymentDetailsSchema,
  OrderSummarySchema,
  CustomerReviewSchema,
  DriverReviewSchema,
  OrderTrackingSchema,
} from './order.schemas.js';
import { orderMethods } from './order.methods.js';
import { orderStatics } from './order.statics.js';

const OrderSchema = new Schema<IOrder, IOrderModel>(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    customer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Customer is required'],
      index: true,
    },
    driver: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    products: {
      type: [OrderProductSchema],
      required: true,
      validate: {
        validator: function(products: any[]) {
          return products && products.length > 0;
        },
        message: 'Order must have at least one product',
      },
    },
    shippingAddress: {
      type: ShippingAddressSchema,
      required: true,
    },
    billingAddress: {
      type: ShippingAddressSchema,
    },
    paymentDetails: {
      type: PaymentDetailsSchema,
      required: true,
    },
    orderSummary: {
      type: OrderSummarySchema,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(OrderStatus),
      default: OrderStatus.PENDING,
      index: true,
    },
    trackingHistory: {
      type: [OrderTrackingSchema],
      default: [],
    },
    proofOfDelivery: {
      type: String,
    },
    deliveryInstructions: {
      type: String,
      maxlength: 500,
    },
    customerReview: {
      type: CustomerReviewSchema,
    },
    driverReview: {
      type: DriverReviewSchema,
    },
    estimatedDeliveryDate: {
      type: Date,
    },
    actualDeliveryDate: {
      type: Date,
    },
    cancelReason: {
      type: String,
      maxlength: 500,
    },
    refundReason: {
      type: String,
      maxlength: 500,
    },
    notes: {
      type: String,
      maxlength: 1000,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function(doc, ret) {
        const { __v, ...cleanRet } = ret;
        return cleanRet;
      },
    },
    toObject: {
      virtuals: true,
    },
  }
);

// Indexes for better query performance
OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ 'products.seller': 1 });
OrderSchema.index({ 'paymentDetails.status': 1 });
OrderSchema.index({ orderNumber: 'text', 'products.name': 'text' });

// Virtual properties
OrderSchema.virtual('isDelivered').get(function() {
  return this.status === OrderStatus.DELIVERED;
});

OrderSchema.virtual('isCancelled').get(function() {
  return this.status === OrderStatus.CANCELLED;
});

OrderSchema.virtual('isPaid').get(function() {
  return this.paymentDetails.status === PaymentStatus.COMPLETED;
});

OrderSchema.virtual('daysUntilDelivery').get(function() {
  if (!this.estimatedDeliveryDate) return null;
  const now = new Date();
  const deliveryDate = new Date(this.estimatedDeliveryDate);
  const diffTime = deliveryDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Pre-save middleware
OrderSchema.pre('save', async function(next) {
  if (this.isNew) {
    if (!this.orderNumber) {
      const Order = this.constructor as IOrderModel;
      this.orderNumber = await Order.generateOrderNumber();
    }
    
    this.trackingHistory.push({
      status: OrderStatus.PENDING,
      timestamp: new Date(),
      description: 'Order placed',
    });
  }
  
  if (this.isModified('status')) {
    this.trackingHistory.push({
      status: this.status,
      timestamp: new Date(),
      description: `Order status updated to ${this.status}`,
    });
  }
  
  next();
});

OrderSchema.pre('save', function(next) {
  if (this.orderSummary) {
    const subtotal = this.products.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    this.orderSummary.subtotal = subtotal;
    this.orderSummary.total = 
      subtotal + 
      this.orderSummary.shippingFee + 
      this.orderSummary.marketplaceFee + 
      this.orderSummary.taxes - 
      (this.orderSummary.discount || 0);
  }
  next();
});

// Post-save middleware for population
OrderSchema.post('save', async function(doc) {
  await doc.populate([
    { path: 'customer', select: 'firstName lastName email phone' },
    { path: 'driver', select: 'firstName lastName email phone' },
    { path: 'products.product', select: 'title price images' },
  ]);
});

// Instance methods
Object.assign(OrderSchema.methods, orderMethods);

// Static methods
Object.assign(OrderSchema.statics, orderStatics);

// Create and export the model
const Order = model<IOrder, IOrderModel>('Order', OrderSchema);

export default Order;