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
  OrderTrackingSchema,
  InfoSchema,
} from './order.schemas.js';
import { orderMethods } from './order.methods.js';
import { orderStatics } from './order.statics.js';

const OrderSchema = new Schema<IOrder, IOrderModel>(
  {
    orderNumber: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    customer: {
      type: InfoSchema,
    },
    driver: {
      type: InfoSchema,
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
    date: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    orderSummary: {
      type: new Schema({
        shippingAddress: {
          type: ShippingAddressSchema,
          required: true,
        },
        proofOfDelivery: {
          type: String,
        },
        paymentMethod: {
          type: PaymentDetailsSchema,
          required: true,
        },
        subTotal: {
          type: Number,
          required: true,
          min: 0,
        },
        shippingFee: {
          type: Number,
          required: true,
          min: 0,
          default: 0,
        },
        marketplaceFee: {
          type: Number,
          required: true,
          min: 0,
          default: 0,
        },
        taxes: {
          type: Number,
          required: true,
          min: 0,
          default: 0,
        },
        total: {
          type: Number,
          required: true,
          min: 0,
        },
      }, { _id: false }),
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
    deliveryInstructions: {
      type: String,
      maxlength: 500,
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
OrderSchema.index({ 'orderSummary.paymentMethod.status': 1 });
OrderSchema.index({ id: 1 });
OrderSchema.index({ orderNumber: 'text', 'products.title': 'text' });

// Virtual properties
OrderSchema.virtual('isDelivered').get(function() {
  return this.status === OrderStatus.DELIVERED;
});

OrderSchema.virtual('isCancelled').get(function() {
  return this.status === OrderStatus.CANCELLED;
});

OrderSchema.virtual('isPaid').get(function() {
  return this.orderSummary?.paymentMethod?.status === PaymentStatus.COMPLETED;
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
    
    if (this.trackingHistory) {
      this.trackingHistory.push({
        status: OrderStatus.PENDING,
        timestamp: new Date(),
        description: 'Order placed',
      });
    }
  }
  
  if (this.isModified('status') && this.trackingHistory) {
    this.trackingHistory.push({
      status: this.status,
      timestamp: new Date(),
      description: `Order status updated to ${this.status}`,
    });
  }
  
  next();
});

OrderSchema.pre('save', function(next) {
  if (!this.id) {
    this.id = Date.now().toString();
  }
  
  if (!this.date) {
    const now = new Date();
    this.date = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  
  if (this.orderSummary) {
    const subTotal = this.products.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    this.orderSummary.subTotal = subTotal;
    this.orderSummary.total = 
      subTotal + 
      this.orderSummary.shippingFee + 
      this.orderSummary.marketplaceFee + 
      this.orderSummary.taxes;
    this.amount = this.orderSummary.total;
  }
  next();
});

// Post-save middleware for population
OrderSchema.post('save', async function() {
  if (this.customer?.userRef) {
    await this.populate('customer.userRef', 'displayName email phone avatar');
  }
  if (this.driver?.userRef) {
    await this.populate('driver.userRef', 'displayName email phone avatar');
  }
  if (this.products?.length > 0) {
    await this.populate('products.productRef', 'title price images');
  }
});

// Instance methods
Object.assign(OrderSchema.methods, orderMethods);

// Static methods
Object.assign(OrderSchema.statics, orderStatics);

// Create and export the model
const Order = model<IOrder, IOrderModel>('Order', OrderSchema);

export default Order;