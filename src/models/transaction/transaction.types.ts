import { Document, Types } from 'mongoose';

export enum TransactionType {
  PAYMENT = 'payment',
  REFUND = 'refund',
  PARTIAL_REFUND = 'partial_refund',
  PAYOUT = 'payout',
  FEE = 'fee',
  ADJUSTMENT = 'adjustment'
}

export enum TransactionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REQUIRES_ACTION = 'requires_action',
  REQUIRES_PAYMENT_METHOD = 'requires_payment_method',
  REQUIRES_CONFIRMATION = 'requires_confirmation'
}

export interface ITransaction extends Document {
  transactionId: string;
  type: TransactionType;
  status: TransactionStatus;
  
  // Related entities
  order?: Types.ObjectId;
  user: Types.ObjectId;
  seller?: Types.ObjectId;
  
  // Payment details
  amount: number;
  currency: string;
  paymentMethod: string;
  
  // Stripe specific IDs
  stripePaymentIntentId: string;
  stripeChargeId?: string;
  stripeRefundId?: string;
  stripeTransferId?: string;
  stripeCustomerId?: string;
  stripePaymentMethodId?: string;
  
  // Card details (masked)
  cardLast4?: string;
  cardBrand?: string;
  cardExpMonth?: number;
  cardExpYear?: number;
  cardFingerprint?: string;
  
  // Additional info
  description?: string;
  metadata?: Record<string, any>;
  failureCode?: string;
  failureMessage?: string;
  
  // Fees
  stripeFee?: number;
  platformFee?: number;
  processingFee?: number;
  netAmount?: number;
  
  // Timestamps
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}