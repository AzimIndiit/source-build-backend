import { Schema, model, Document } from 'mongoose';
import Joi from 'joi';

export interface IUserCard extends Document {
  userId: Schema.Types.ObjectId;
  paymentMethodId: string;
  tokenId?: string; // Store the token ID for reference
  last4: string;
  brand: string;
  expiryMonth: number;
  expiryYear: number;
  cardholderName: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const userCardSchema = new Schema<IUserCard>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    paymentMethodId: {
      type: String,
      required: true,
      unique: true,
    },
    tokenId: {
      type: String,
      required: false,
    },
    last4: {
      type: String,
      required: true,
      length: 4,
    },
    brand: {
      type: String,
      required: true,
      default: '',
    },
    expiryMonth: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    expiryYear: {
      type: Number,
      required: true,
    },
    cardholderName: {
      type: String,
      required: true,
      trim: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
userCardSchema.index({ userId: 1, isDefault: -1 });
userCardSchema.index({ userId: 1, createdAt: -1 });

// Validation schemas
const createCardSchema = Joi.object({
  userId: Joi.string().required(),
  cardNumber: Joi.string()
    .pattern(/^[0-9]{13,19}$/)
    .required()
    .messages({
      'string.pattern.base': 'Card number must be between 13 and 19 digits',
    }),
  expiryMonth: Joi.number().min(1).max(12).required(),
  expiryYear: Joi.number().min(new Date().getFullYear()).required(),
  cvv: Joi.string()
    .pattern(/^[0-9]{3,4}$/)
    .required()
    .messages({
      'string.pattern.base': 'CVV must be 3 or 4 digits',
    }),
  cardholderName: Joi.string().trim().min(2).max(100).required(),
  isDefault: Joi.boolean().optional(),
});

const updateCardSchema = Joi.object({
  isDefault: Joi.boolean().optional(),
  cardholderName: Joi.string().trim().min(2).max(100).optional(),
});

// Static methods for validation
userCardSchema.statics.validateCreate = function(data: any) {
  return createCardSchema.validate(data);
};

userCardSchema.statics.validateUpdate = function(data: any) {
  return updateCardSchema.validate(data);
};

// Pre-save middleware to ensure only one default card per user
userCardSchema.pre('save', async function(next) {
  if (this.isNew || this.isModified('isDefault')) {
    if (this.isDefault) {
      // Remove default status from other cards
      await UserCard.updateMany(
        { userId: this.userId, _id: { $ne: this._id } },
        { isDefault: false }
      );
    } else {
      // If this is the first card, make it default
      const count = await UserCard.countDocuments({ userId: this.userId });
      if (count === 0) {
        this.isDefault = true;
      }
    }
  }
  next();
});

export const UserCard = model<IUserCard>('UserCard', userCardSchema);