import { Document, Types, Model } from 'mongoose';

export enum OrderStatus {
  PENDING = 'Pending',
  PROCESSING = 'Processing',
  IN_TRANSIT = 'in-transit',
  OUT_FOR_DELIVERY = 'Out for Delivery',
  DELIVERED = 'Delivered',
  CANCELLED = 'Cancelled',
  REFUNDED = 'Refunded',
}

export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

export enum PaymentMethod {
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  PAYPAL = 'paypal',
  STRIPE = 'stripe',
  CASH_ON_DELIVERY = 'cash_on_delivery',
  BANK_TRANSFER = 'bank_transfer',
}

export interface IShippingAddress {
  name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  country: string;
  zip: string;
  isDefault?: boolean;
}

export interface IOrderProduct {
  id: string;
  title: string;
  price: number;
  quantity: number;
  image?: string;
  deliveryDate?: string;
  productRef?: Types.ObjectId;
  seller?: Types.ObjectId;
}

export interface IPaymentDetails {
  type: string;
  cardType?: string;
  cardNumber?: string;
  method?: PaymentMethod;
  status?: PaymentStatus;
  transactionId?: string;
  paidAt?: Date;
}

export interface IOrderSummary {
  subTotal: number;
  shippingFee: number;
  marketplaceFee: number;
  taxes: number;
  discount?: number;
  total: number;
}

export interface IReviewInfo {
  rating: number;
  review: string;
  reviewedAt?: Date;
}

export interface IUserInfo {
  userRef: Types.ObjectId;
  reviewRef?: IReviewInfo;
}

export interface ICustomerInfo extends IUserInfo {}

export interface IDriverInfo extends IUserInfo {}

export interface ISellerInfo extends IUserInfo {}

export interface ICustomerReview {
  rating: number;
  review: string;
  reviewedAt: Date;
}

export interface IDriverReview {
  rating: number;
  review: string;
  reviewedAt: Date;
}

export interface IOrderTracking {
  status: OrderStatus;
  timestamp: Date;
  location?: string;
  description?: string;
  updatedBy?: Types.ObjectId;
}

export interface IOrder extends Document, IOrderMethods {
  orderNumber?: string;
  customer: ICustomerInfo;
  driver?: IDriverInfo;
  seller?: ISellerInfo;
  products: IOrderProduct[];
  date: string;
  amount: number;
  status: OrderStatus;
  orderSummary: IOrderSummary & {
    shippingAddress: IShippingAddress;
    pickupAddress?: IShippingAddress;
    proofOfDelivery?: string;
    deliveryMessage?: string;
    paymentMethod: IPaymentDetails;
    subTotal: number;
  };
  trackingHistory?: IOrderTracking[];
  deliveryInstructions?: string;
  estimatedDeliveryDate?: Date;
  actualDeliveryDate?: Date;
  cancelReason?: string;
  refundReason?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IOrderMethods {
  calculateTotal(): number;
  updateStatus(status: OrderStatus, updatedBy?: Types.ObjectId): Promise<IOrder>;
  assignDriver(driverId: Types.ObjectId): Promise<IOrder>;
  markAsDelivered(proofOfDelivery?: string, deliveryMessage?: string): Promise<IOrder>;
  cancelOrder(reason: string, updatedBy?: Types.ObjectId): Promise<IOrder>;
  initiateRefund(reason: string): Promise<IOrder>;
  addCustomerReview(rating: number, review: string): Promise<IOrder>;
  addDriverReview(rating: number, review: string): Promise<IOrder>;
  getTrackingInfo(): IOrderTracking[];
  sendNotification(type: string): Promise<void>;
}

export interface IOrderModel extends Model<IOrder, {}, IOrderMethods> {
  findByCustomer(customerId: Types.ObjectId): Promise<IOrder[]>;
  findByDriver(driverId: Types.ObjectId): Promise<IOrder[]>;
  findBySeller(sellerId: Types.ObjectId): Promise<IOrder[]>;
  findByStatus(status: OrderStatus): Promise<IOrder[]>;
  findPendingOrders(): Promise<IOrder[]>;
  findDeliveredOrders(startDate?: Date, endDate?: Date): Promise<IOrder[]>;
  generateOrderNumber(): Promise<string>;
  getOrderStats(period?: 'day' | 'week' | 'month' | 'year'): Promise<any>;
  searchOrders(query: string): Promise<IOrder[]>;
}

// DTOs for API operations
export interface CreateOrderDTO {
  customer: string;
  products: {
    product: string;
    quantity: number;
    price: number;
  }[];
  shippingAddress: IShippingAddress;
  pickupAddress?: IShippingAddress;
  billingAddress?: IShippingAddress;
  paymentMethod: PaymentMethod;
  deliveryInstructions?: string;
  notes?: string;
}

export interface UpdateOrderDTO {
  status?: OrderStatus;
  driver?: string;
  shippingAddress?: IShippingAddress;
  deliveryInstructions?: string;
  estimatedDeliveryDate?: Date;
  notes?: string;
}

export interface OrderFilterDTO {
  status?: OrderStatus;
  customer?: string;
  seller?: string;  
  driver?: string;
  startDate?: Date;
  endDate?: Date;
  minAmount?: number;
  maxAmount?: number;
  paymentMethod?: PaymentMethod;
  paymentStatus?: PaymentStatus;
  search?: string;
  page?: number;
  limit?: number;
  sort?: string;
}