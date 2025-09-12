import { Model, Types } from 'mongoose';
import { IProduct, ProductStatus } from '@models/product/product.types.js';
import Wishlist from '@models/wishlist/wishlist.model.js';
import Review from '@models/review/review.model.js';
import { ReviewType } from '@models/review/review.types.js';

export async function findByCategory(
  this: Model<IProduct>,
  category: string
): Promise<IProduct[]> {
  return this.find({ 
    category, 
    status: ProductStatus.ACTIVE 
  })
  .populate('seller', 'name email profileImage')
  .sort('-createdAt')
  .exec();
}

export async function findBySeller(
  this: Model<IProduct>,
  sellerId: Types.ObjectId
): Promise<IProduct[]> {
  return this.find({ 
    seller: sellerId 
  })
  .sort('-createdAt')
  .exec();
}

export async function findFeatured(
  this: Model<IProduct>
): Promise<IProduct[]> {
  return this.find({ 
    featured: true, 
    status: ProductStatus.ACTIVE 
  })
  .populate('seller', 'name email profileImage')
  .sort('-createdAt')
  .limit(10)
  .exec();
}

export async function searchProducts(
  this: Model<IProduct>,
  query: string
): Promise<IProduct[]> {
  const searchRegex = new RegExp(query, 'i');
  
  return this.find({
    $or: [
      { title: searchRegex },
      { description: searchRegex },
      { brand: searchRegex },
      { productTag: { $in: [searchRegex] } },
      { category: searchRegex },
      { subCategory: searchRegex },
    ],
    status: ProductStatus.ACTIVE,
  })
  .populate('seller', 'name email profileImage')
  .sort('-createdAt')
  .exec();
}

export async function updateStock(
  this: Model<IProduct>,
  productId: Types.ObjectId,
  quantity: number
): Promise<IProduct | null> {
  const product = await this.findById(productId);
  
  if (!product) {
    return null;
  }
  
  product.quantity = quantity;
  
  // if (quantity === 0) {
  //   product.status = ProductStatus.OUT_OF_STOCK;
  // } else if (product.status === ProductStatus.OUT_OF_STOCK) {
  //   product.status = ProductStatus.ACTIVE;
  // }
  
  await product.save();
  return product;
}

export async function populateWishlistStatus(
  this: Model<IProduct>,
  products: IProduct[],
  userId: string | null
): Promise<any[]> {
  if (!userId || products.length === 0) {
    return products.map(product => ({
      ...product.toObject(),
      isInWishlist: false,
      hasUserReviewed: false
    }));
  }

  // Get wishlist items
  const wishlist = await Wishlist.findOne({ user: userId });
  const wishlistProductIds = wishlist ? wishlist.items.map(item => item.product.toString()) : [];

  // Get all product IDs that the user has reviewed
  const productIds = products.map(p => p._id);
  const userReviews = await Review.find({
    reviewer: userId,
    product: { $in: productIds },
    type: ReviewType.PRODUCT
  }).select('product');
  
  const reviewedProductIds = userReviews.map(review => review.product.toString());

  return products.map(product => {
    const productObj = product.toObject();
    return {
      ...productObj,
      isInWishlist: wishlistProductIds.includes(productObj._id.toString()),
      hasUserReviewed: reviewedProductIds.includes(productObj._id.toString())
    };
  });
}

export async function populateSingleWishlistStatus(
  this: Model<IProduct>,
  product: IProduct,
  userId: string | null
): Promise<any> {
  if (!userId) {
    return {
      ...product.toObject(),
      isInWishlist: false,
      hasUserReviewed: false,
      userReview: null
    };
  }

  const isInWishlist = await Wishlist.checkProductInWishlist(
    new Types.ObjectId(userId),
    new Types.ObjectId(product._id)
  );

  // Check if user has already reviewed this product
  const existingReview = await Review.findOne({
    reviewer: userId,
    product: product._id,
    type: ReviewType.PRODUCT
  }).select('_id rating comment title images');

  return {
    ...product.toObject(),
    isInWishlist,
    hasUserReviewed: !!existingReview,
    userReview: existingReview ? {
      id: existingReview._id,
      rating: existingReview.rating,
      comment: existingReview.comment,
      title: existingReview.title,
      images: existingReview.images
    } : null
  };
}

// Alias for backward compatibility and better naming
export const populateUserProductStatus = populateSingleWishlistStatus;