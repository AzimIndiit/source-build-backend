import { Schema } from 'mongoose'
import {
  IShippingAddress,
  IOrderProduct,
  IPaymentDetails,
  IOrderSummary,
  ICustomerInfo,
  IDriverReview,
  IOrderTracking,
  OrderStatus,
  PaymentStatus,
  PaymentMethod,
} from './order.types.js'

export const ShippingAddressSchema = new Schema<IShippingAddress>(
  {
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
  },
  { _id: false }
)

export const OrderProductSchema = new Schema<IOrderProduct>(
  {
    id: {
      type: String,
      required: [true, 'Product ID is required'],
    },
    title: {
      type: String,
      required: [true, 'Product title is required'],
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
    color: {
      type: String, // For variant identification
    },
    deliveryDate: {
      type: String,
    },
    productRef: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
    },
    seller: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { _id: false }
)

export const PaymentDetailsSchema = new Schema<IPaymentDetails>(
  {
    type: {
      type: String,
      required: [true, 'Payment type is required'],
      default: 'Credit Card',
    },
    cardType: {
      type: String,
      enum: ['VISA', 'MASTERCARD', 'AMEX', 'DISCOVER'],
    },
    cardNumber: {
      type: String,
    },
    method: {
      type: String,
      enum: Object.values(PaymentMethod),
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
    paidAt: {
      type: Date,
    },
  },
  { _id: false }
)

export const ReviewSchema = new Schema<IDriverReview>(
  {
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
    review: {
      type: String,
      maxlength: 1000,
      default: '',
    },
    reviewedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
)

export const InfoSchema = new Schema<ICustomerInfo>(
  {
    userRef: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reviewRef: {
      type: ReviewSchema,
    },
  },
  { _id: false }
)

export const OrderSummarySchema = new Schema<IOrderSummary>(
  {
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
  },
  { _id: false }
)

export const OrderTrackingSchema = new Schema<IOrderTracking>(
  {
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
  },
  { _id: false }
)
