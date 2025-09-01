import { Schema } from 'mongoose';
import { 
  IDiscount, 
  IVariant, 
  IMarketplaceOptions,
  IDimensions,
  IPickupHours,
  DiscountType,
  ProductStatus 
} from './product.types.js';

export const discountSchema = new Schema<IDiscount>(
  {
    discountType: {
      type: String,
      enum: Object.values(DiscountType),
      default: DiscountType.NONE,
      required: true,
    },
    discountValue: {
      type: Number,
      min: 0,
      validate: {
        validator: function(this: IDiscount, value: number) {
          if (this.discountType === DiscountType.PERCENTAGE) {
            return value >= 0 && value <= 100;
          }
          if (this.discountType === DiscountType.FLAT) {
            return value >= 0;
          }
          return true;
        },
        message: 'Invalid discount value for the specified discount type',
      },
    },
  },
  { _id: false }
);

export const variantSchema = new Schema<IVariant>(
  {
    color: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: (value: string) => /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(value),
        message: 'Invalid HEX color code',
      },
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
      max: 99999,
      validate: {
        validator: Number.isInteger,
        message: 'Quantity must be an integer',
      },
    },
    price: {
      type: Number,
      required: true,
      min: 0,
      max: 999999.99,
    },
    discount: {
      type: discountSchema,
      default: { discountType: DiscountType.NONE },
    },
    images: [{
      type: String,
      trim: true,
    }],
  },
  { _id: false }
);

export const marketplaceOptionsSchema = new Schema<IMarketplaceOptions>(
  {
    pickup: {
      type: Boolean,
      default: false,
    },
    shipping: {
      type: Boolean,
      default: false,
    },
    delivery: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

export const dimensionsSchema = new Schema<IDimensions>(
  {
    width: {
      type: String,
      trim: true,
    },
    length: {
      type: String,
      trim: true,
    },
    height: {
      type: String,
      trim: true,
    },
    unit: {
      type: String,
      enum: ['inches', 'cm', 'feet', 'meters'],
      default: 'inches',
    },
  },
  { _id: false }
);

export const pickupHoursSchema = new Schema<IPickupHours>(
  {
    monday: {
      open: String,
      close: String,
    },
    tuesday: {
      open: String,
      close: String,
    },
    wednesday: {
      open: String,
      close: String,
    },
    thursday: {
      open: String,
      close: String,
    },
    friday: {
      open: String,
      close: String,
    },
    saturday: {
      open: String,
      close: String,
    },
    sunday: {
      open: String,
      close: String,
    },
  },
  { _id: false }
);