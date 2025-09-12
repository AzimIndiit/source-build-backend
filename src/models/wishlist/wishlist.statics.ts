import { Types } from 'mongoose';
import { IWishlist, IWishlistModel } from './wishlist.types.js';

export async function findByUser(this: IWishlistModel, userId: Types.ObjectId): Promise<IWishlist | null> {
  return this.findOne({ user: userId });
}

export async function getWishlistWithProducts(this: IWishlistModel, userId: Types.ObjectId): Promise<IWishlist | null> {
  return this.findOne({ user: userId })
    .populate({
      path: 'items.product',
      select: 'title price images slug discount rating stock status',
    });
}

export async function countWishlistItems(this: IWishlistModel, userId: Types.ObjectId): Promise<number> {
  const wishlist = await this.findOne({ user: userId });
  return wishlist ? wishlist.items.length : 0;
}

export async function getPopularWishlistItems(this: IWishlistModel, limit: number = 10): Promise<Array<{ product: Types.ObjectId; count: number }>> {
  const result = await this.aggregate([
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.product',
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
    { $limit: limit },
    {
      $project: {
        _id: 0,
        product: '$_id',
        count: 1,
      },
    },
  ]);
  
  return result;
}

export async function checkProductInWishlist(this: IWishlistModel, userId: Types.ObjectId, productId: Types.ObjectId): Promise<boolean> {
  const wishlist = await this.findOne({
    user: userId,
    'items.product': productId,
  });
  
  return !!wishlist;
}