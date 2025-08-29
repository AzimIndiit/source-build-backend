import { Schema } from 'mongoose';
import { 
  IShippingAddress, 
  IOrderProduct, 
  IPaymentDetails, 
  IOrderSummary,
  ICustomerReview,
  IDriverReview,
  IOrderTracking,
  OrderStatus,
  PaymentStatus,
  PaymentMethod
} from './order.types.js';

export const ShippingAddressSchema = new Schema<IShippingAddress>({
  name: {
    type: String,
    required: [true, 'Recipient name is required'],
    trim: true,
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
  },
  address: {
    type: String,
    required: [true, 'Address is required'],
    trim: true,
  },
  city: {
    type: String,
    required: [true, 'City is required'],
    trim: true,
  },
  state: {
    type: String,
    required: [true, 'State is required'],
    trim: true,
  },
  country: {
    type: String,
    required: [true, 'Country is required'],
    trim: true,
  },
  zip: {
    type: String,
    required: [true, 'ZIP code is required'],
    trim: true,
  },
  isDefault: {
    type: Boolean,
    default: false,
  },
}, { _id: false });

export const OrderProductSchema = new Schema<IOrderProduct>({
  product: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product reference is required'],
  },
  name: {
    type: String,
    required: [true, 'Product name is required'],
  },
  price: {
    type: Number,
    required: [true, 'Product price is required'],
    min: [0, 'Price cannot be negative'],
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [1, 'Quantity must be at least 1'],
  },
  image: {
    type: String,
  },
  deliveryDate: {
    type: Date,
  },
  seller: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
}, { _id: false });

export const PaymentDetailsSchema = new Schema<IPaymentDetails>({
  method: {
    type: String,
    enum: Object.values(PaymentMethod),
    required: [true, 'Payment method is required'],
  },
  status: {
    type: String,
    enum: Object.values(PaymentStatus),
    default: PaymentStatus.PENDING,
  },
  transactionId: {
    type: String,
    sparse: true,
  },
  cardType: {
    type: String,
    enum: ['VISA', 'MASTERCARD', 'AMEX', 'DISCOVER'],
  },
  cardNumber: {
    type: String,
  },
  paidAt: {
    type: Date,
  },
}, { _id: false });

export const OrderSummarySchema = new Schema<IOrderSummary>({
  subtotal: {
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
  discount: {
    type: Number,
    min: 0,
    default: 0,
  },
  total: {
    type: Number,
    required: true,
    min: 0,
  },
}, { _id: false });

export const CustomerReviewSchema = new Schema<ICustomerReview>({
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  review: {
    type: String,
    required: true,
    maxlength: 1000,
  },
  reviewedAt: {
    type: Date,
    default: Date.now,
  },
}, { _id: false });

export const DriverReviewSchema = new Schema<IDriverReview>({
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  review: {
    type: String,
    required: true,
    maxlength: 1000,
  },
  reviewedAt: {
    type: Date,
    default: Date.now,
  },
}, { _id: false });

export const OrderTrackingSchema = new Schema<IOrderTracking>({
  status: {
    type: String,
    enum: Object.values(OrderStatus),
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  location: {
    type: String,
  },
  description: {
    type: String,
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
}, { _id: false });