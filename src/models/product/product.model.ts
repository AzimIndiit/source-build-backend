import { Schema, model } from 'mongoose';
import slugify from 'slugify';
import { 
  IProduct, 
  IProductModel,
  ProductStatus,
  DiscountType
} from '@models/product/product.types.js';
import { 
  discountSchema, 
  variantSchema, 
  marketplaceOptionsSchema 
} from '@models/product/product.schemas.js';
import {
  calculateDiscountedPrice,
  calculateVariantPrice,
  isAvailable,
  incrementView,
  incrementLike,
  decrementQuantity,
} from '@models/product/product.methods.js';
import {
  findByCategory,
  findBySeller,
  findFeatured,
  searchProducts,
  updateStock,
} from '@models/product/product.statics.js';

const productSchema = new Schema<IProduct, IProductModel>(
  {
    title: {
      type: String,
      required: [true, 'Product title is required'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters'],
      maxlength: [100, 'Title must not exceed 100 characters'],
      index: true,
    },
    slug: {
      type: String,
      required: [true, 'Product slug is required'],
      trim: true,
      unique: true,
    },
    price: {
      type: Number,
      required: [true, 'Product price is required'],
      min: [0, 'Price must be positive'],
      max: [999999.99, 'Price must not exceed 999,999.99'],
    },
    description: {
      type: String,
      required: [true, 'Product description is required'],
      trim: true,
      minlength: [10, 'Description must be at least 10 characters'],
      maxlength: [2000, 'Description must not exceed 2000 characters'],
    },
    category: {
      type: String,
      required: [true, 'Product category is required'],
      trim: true,
      index: true,
    },
    subCategory: {
      type: String,
      required: [true, 'Product sub-category is required'],
      trim: true,
      index: true,
    },
    quantity: {
      type: Number,
      required: [true, 'Product quantity is required'],
      min: [0, 'Quantity cannot be negative'],
      max: [99999, 'Quantity must not exceed 99,999'],
      validate: {
        validator: Number.isInteger,
        message: 'Quantity must be an integer',
      },
    },
    brand: {
      type: String,
      required: [true, 'Product brand is required'],
      trim: true,
      minlength: [2, 'Brand must be at least 2 characters'],
      maxlength: [50, 'Brand must not exceed 50 characters'],
      index: true,
    },
    color: {
      type: String,
      required: [true, 'Product color is required'],
      trim: true,
      validate: {
        validator: (value: string) => /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(value),
        message: 'Invalid HEX color code',
      },
    },
    locationAddress: {
      type: String,
      required: [true, 'Location address is required'],
      trim: true,
      minlength: [5, 'Location must be at least 5 characters'],
      maxlength: [200, 'Location must not exceed 200 characters'],
    },
    productTag: [{
      type: String,
      trim: true,
      minlength: [2, 'Each tag must be at least 2 characters'],
      maxlength: [30, 'Each tag must not exceed 30 characters'],
    }],
    variants: {
      type: [variantSchema],
      validate: {
        validator: (variants: any[]) => variants.length <= 5,
        message: 'Maximum 5 variants allowed',
      },
    },
    marketplaceOptions: {
      type: marketplaceOptionsSchema,
      default: () => ({
        pickup: false,
        shipping: false,
        delivery: false,
      }),
    },
    pickupHours: {
      type: String,
      trim: true,
      maxlength: [100, 'Pickup hours must not exceed 100 characters'],
    },
    shippingPrice: {
      type: Number,
      min: [0, 'Shipping price must be positive'],
    },
    readyByDate: {
      type: Date,
    },
    readyByTime: {
      type: String,
      trim: true,
    },
    discount: {
      type: discountSchema,
      default: () => ({ discountType: DiscountType.NONE }),
    },
    images: [{
      type: String,
      required: true,
      trim: true,
    }],
    status: {
      type: String,
      enum: Object.values(ProductStatus),
      default: ProductStatus.DRAFT,
      index: true,
    },
    seller: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Seller reference is required'],
      index: true,
    },
    views: {
      type: Number,
      default: 0,
      min: 0,
    },
    likes: {
      type: Number,
      default: 0,
      min: 0,
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalReviews: {
      type: Number,
      default: 0,
      min: 0,
    },
    sold: {
      type: Number,
      default: 0,
      min: 0,
    },
    featured: {
      type: Boolean,
      default: false,
      index: true,
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
productSchema.index({ title: 'text', description: 'text', productTag: 'text' });
productSchema.index({ price: 1, createdAt: -1 });
productSchema.index({ seller: 1, status: 1 });
productSchema.index({ category: 1, subCategory: 1, status: 1 });
productSchema.index({ featured: 1, status: 1, createdAt: -1 });

// Virtual for calculating the final price after discount
productSchema.virtual('finalPrice').get(function() {
  return this.calculateDiscountedPrice();
});

// Instance methods
Object.assign(productSchema.methods, {
  calculateDiscountedPrice,
  calculateVariantPrice,
  isAvailable,
  incrementView,
  incrementLike,
  decrementQuantity,
});

// Static methods
Object.assign(productSchema.statics, {
  findByCategory,
  findBySeller,
  findFeatured,
  searchProducts,
  updateStock,
});

// Pre-save middleware
productSchema.pre('save', function(next) {
  // Generate slug from title if not provided or if title changed
  if (this.isModified('title') || !this.slug) {
    this.slug = slugify(this.title, {
      lower: true,
      strict: true,
      remove: /[*+~.()'"!:@]/g,
      replacement: '-'
    });
  }

  // Auto-update status based on quantity
  if (this.isModified('quantity')) {
    if (this.quantity === 0) {
      this.status = ProductStatus.OUT_OF_STOCK;
    } else if (this.status === ProductStatus.OUT_OF_STOCK && this.quantity > 0) {
      this.status = ProductStatus.ACTIVE;
    }
  }

  // Validate marketplace options
  if (this.marketplaceOptions?.pickup && !this.pickupHours) {
    return next(new Error('Pickup hours are required when pickup option is enabled'));
  }

  if (this.marketplaceOptions?.shipping && this.shippingPrice === undefined) {
    return next(new Error('Shipping price is required when shipping option is enabled'));
  }

  next();
});

// Pre-findOneAndUpdate middleware for slug generation
productSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate() as any;
  
  // Generate slug if title is being updated
  if (update.title) {
    update.slug = slugify(update.title, {
      lower: true,
      strict: true,
      remove: /[*+~.()'"!:@]/g,
      replacement: '-'
    });
  }
  
  next();
});

// Create and export the model
const ProductModal = model<IProduct, IProductModel>('Product', productSchema);

export default ProductModal;