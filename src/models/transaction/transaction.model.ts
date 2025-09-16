import { Schema, model } from 'mongoose';
import { ITransaction, TransactionType, TransactionStatus } from './transaction.types.js';
import { v4 as uuidv4 } from 'uuid';

const transactionSchema = new Schema<ITransaction>(
  {
    transactionId: {
      type: String,
      required: true,
      unique: true,
      default: () => `txn_${uuidv4()}`
    },
    type: {
      type: String,
      enum: Object.values(TransactionType),
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: Object.values(TransactionStatus),
      required: true,
      default: TransactionStatus.PENDING,
      index: true
    },
    
    // Related entities
    order: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      index: true
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    seller: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    
    // Payment details
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      required: true,
      default: 'usd',
      lowercase: true
    },
    paymentMethod: {
      type: String,
      required: true
    },
    
    // Stripe specific IDs
    stripePaymentIntentId: {
      type: String,
      required: true,
      index: true
    },
    stripeChargeId: {
      type: String,
      index: true
    },
    stripeRefundId: {
      type: String,
      index: true
    },
    stripeTransferId: {
      type: String,
      index: true
    },
    stripeCustomerId: {
      type: String,
      index: true
    },
    stripePaymentMethodId: {
      type: String,
      index: true
    },
    
    // Card details (masked)
    cardLast4: String,
    cardBrand: String,
    cardExpMonth: Number,
    cardExpYear: Number,
    cardFingerprint: String,
    
    // Additional info
    description: String,
    metadata: {
      type: Schema.Types.Mixed,
      default: {}
    },
    failureCode: String,
    failureMessage: String,
    
    // Fees
    stripeFee: {
      type: Number,
      default: 0
    },
    platformFee: {
      type: Number,
      default: 0
    },
    processingFee: {
      type: Number,
      default: 0
    },
    netAmount: {
      type: Number,
      default: 0
    },
    
    // Timestamps
    processedAt: Date
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Indexes for performance
transactionSchema.index({ createdAt: -1 });
transactionSchema.index({ user: 1, createdAt: -1 });
transactionSchema.index({ order: 1 });
transactionSchema.index({ stripePaymentIntentId: 1 });
transactionSchema.index({ status: 1, type: 1 });

// Calculate net amount before saving
transactionSchema.pre('save', function(next) {
  if (this.isModified('amount') || this.isModified('stripeFee') || this.isModified('platformFee')) {
    this.netAmount = this.amount - (this.stripeFee || 0) - (this.platformFee || 0) - (this.processingFee || 0);
  }
  
  // Set processedAt when status changes to succeeded
  if (this.isModified('status') && this.status === TransactionStatus.SUCCEEDED && !this.processedAt) {
    this.processedAt = new Date();
  }
  
  next();
});

const Transaction = model<ITransaction>('Transaction', transactionSchema);

export default Transaction;