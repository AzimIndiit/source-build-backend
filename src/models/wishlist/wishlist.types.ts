import { Document, Types, Model } from 'mongoose';

export interface IWishlistItem {
  product: Types.ObjectId;
  addedAt: Date;
  notificationEnabled?: boolean;
  priceAlert?: {
    targetPrice: number;
    alertEnabled: boolean;
  };
}

export interface IWishlist extends Document {
  user: Types.ObjectId;
  items: IWishlistItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IWishlistMethods {
  addItem(productId: string, notificationEnabled?: boolean): Promise<void>;
  removeItem(productId: string): Promise<void>;
  hasProduct(productId: string): boolean;
  clearWishlist(): Promise<void>;
  setPriceAlert(productId: string, targetPrice: number): Promise<void>;
  removePriceAlert(productId: string): Promise<void>;
}

export interface IWishlistModel extends Model<IWishlist, {}, IWishlistMethods> {
  findByUser(userId: Types.ObjectId): Promise<IWishlist | null>;
  getWishlistWithProducts(userId: Types.ObjectId): Promise<IWishlist | null>;
  countWishlistItems(userId: Types.ObjectId): Promise<number>;
  getPopularWishlistItems(limit?: number): Promise<Array<{ product: Types.ObjectId; count: number }>>;
  checkProductInWishlist(userId: Types.ObjectId, productId: Types.ObjectId): Promise<boolean>;
}

export interface AddToWishlistDTO {
  productId: string;
  notificationEnabled?: boolean;
  priceAlert?: {
    targetPrice: number;
    alertEnabled: boolean;
  };
}

export interface RemoveFromWishlistDTO {
  productId: string;
}

export interface WishlistFilterDTO {
  user?: string;
  page?: number;
  limit?: number;
  sort?: string;
}

export interface UpdateWishlistItemDTO {
  productId: string;
  notificationEnabled?: boolean;
  priceAlert?: {
    targetPrice: number;
    alertEnabled: boolean;
  };
}