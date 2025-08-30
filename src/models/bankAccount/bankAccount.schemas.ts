import { Schema } from 'mongoose';
import { IBankAccount, IBankAccountMethods, IBankAccountModel, AccountType } from './bankAccount.types.js';
import crypto from 'crypto';

export const BankAccountSchema = new Schema<IBankAccount, IBankAccountModel, IBankAccountMethods>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    accountHolderName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    bankName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    accountNumber: {
      type: String,
      required: true,
      minlength: 8,
      maxlength: 20,
    },
    routingNumber: {
      type: String,
      required: true,
      length: 9,
    },
    swiftCode: {
      type: String,
      required: true,
      uppercase: true,
      minlength: 8,
      maxlength: 11,
    },
    accountType: {
      type: String,
      enum: Object.values(AccountType),
      required: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
BankAccountSchema.index({ user: 1, isActive: 1 });
BankAccountSchema.index({ user: 1, isDefault: 1 });

// Pre-save hook to format data
BankAccountSchema.pre('save', async function (next) {
  // Store only last 4 digits of account number for display
  // In production, you would store the full encrypted number separately
  if (this.isModified('accountNumber') && this.accountNumber.length > 4) {
    // Keep the last 4 digits visible, mask the rest
    const lastFour = this.accountNumber.slice(-4);
    const maskedLength = this.accountNumber.length - 4;
    this.accountNumber = 'X'.repeat(maskedLength) + lastFour;
  }
  
  // Ensure SWIFT code is uppercase
  if (this.swiftCode) {
    this.swiftCode = this.swiftCode.toUpperCase();
  }
  
  next();
});

// Virtual for masked account display
BankAccountSchema.virtual('maskedAccountNumber').get(function () {
  return this.getMaskedAccountNumber();
});

// JSON transformation
BankAccountSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    // Never expose the actual encrypted account number
    ret.accountNumber = doc.getMaskedAccountNumber();
    return ret;
  },
});