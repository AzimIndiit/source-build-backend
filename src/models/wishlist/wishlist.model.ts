import { Schema, model } from 'mongoose';
import { IWishlist, IWishlistModel } from './wishlist.types.js';
import { wishlistItemSchema } from './wishlist.schemas.js';
import {
  addItem,
  removeItem,
  hasProduct,
  clearWishlist,
  setPriceAlert,
  removePriceAlert,
} from './wishlist.methods.js';
import {
  findByUser,
  getWishlistWithProducts,
  countWishlistItems,
  getPopularWishlistItems,
  checkProductInWishlist,
} from './wishlist.statics.js';

const wishlistSchema = new Schema<IWishlist, IWishlistModel>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
      unique: true,
      index: true,
    },
    items: {
      type: [wishlistItemSchema],
      default: [],
      validate: {
        validator: function(items: any[]) {
          return items.length <= 100;
        },
        message: 'Wishlist cannot contain more than 100 items',
      },
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

wishlistSchema.index({ user: 1, 'items.product': 1 });
wishlistSchema.index({ 'items.addedAt': -1 });
wishlistSchema.index({ 'items.priceAlert.targetPrice': 1 });

wishlistSchema.virtual('itemCount').get(function() {
  return this.items.length;
});

wishlistSchema.virtual('hasPriceAlerts').get(function() {
  return this.items.some(item => item.priceAlert?.alertEnabled);
});

wishlistSchema.methods.addItem = addItem;
wishlistSchema.methods.removeItem = removeItem;
wishlistSchema.methods.hasProduct = hasProduct;
wishlistSchema.methods.clearWishlist = clearWishlist;
wishlistSchema.methods.setPriceAlert = setPriceAlert;
wishlistSchema.methods.removePriceAlert = removePriceAlert;

wishlistSchema.statics.findByUser = findByUser;
wishlistSchema.statics.getWishlistWithProducts = getWishlistWithProducts;
wishlistSchema.statics.countWishlistItems = countWishlistItems;
wishlistSchema.statics.getPopularWishlistItems = getPopularWishlistItems;
wishlistSchema.statics.checkProductInWishlist = checkProductInWishlist;

wishlistSchema.pre('save', function(next) {
  const uniqueProductIds = new Set(this.items.map(item => item.product.toString()));
  if (uniqueProductIds.size !== this.items.length) {
    return next(new Error('Duplicate products in wishlist'));
  }
  next();
});

wishlistSchema.post('save', async function() {
  if (this.items.some(item => item.priceAlert?.alertEnabled)) {
    
  }
});

const Wishlist = model<IWishlist, IWishlistModel>('Wishlist', wishlistSchema);

export default Wishlist;