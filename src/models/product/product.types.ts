import { Document, Model, Types } from 'mongoose';

export enum DiscountType {
  NONE = 'none',
  FLAT = 'flat',
  PERCENTAGE = 'percentage',
}

export enum MarketplaceOption {
  PICKUP = 'pickup',
  SHIPPING = 'shipping',
  DELIVERY = 'delivery',
}

export enum ProductStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  OUT_OF_STOCK = 'out_of_stock',
  DRAFT = 'draft',
  PENDING = 'pending',
  ARCHIVED = 'archived',
}

export interface IDiscount {
  discountType: DiscountType;
  discountValue?: number;
}

export interface IVariant {
  color: string;
  quantity: number;
  price: number;
  discount?: IDiscount;
  images?: string[];
}

export interface IMarketplaceOptions {
  pickup?: boolean;
  shipping?: boolean;
  delivery?: boolean;
}

export interface IProductLocation {
  address: string;
  coordinates: {
    type: 'Point';
    coordinates: [number, number];
  };
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  isDefault?: boolean;
  availabilityRadius?: number;
}

export interface IDimensions {
  width?: number;
  length?: number;
  height?: number;
  unit?: 'inches' | 'cm' | 'feet' | 'meters';
}

export interface IPickupHours {
  monday?: { open: string; close: string };
  tuesday?: { open: string; close: string };
  wednesday?: { open: string; close: string };
  thursday?: { open: string; close: string };
  friday?: { open: string; close: string };
  saturday?: { open: string; close: string };
  sunday?: { open: string; close: string };
}

export interface IProductBase {
  title: string;
  slug: string;
  price: number;
  description: string;
  category: string;
  subCategory: string;
  quantity: number;
  brand: string;
  color: string;
  locationIds: Types.ObjectId[];  // Changed from locations to locationIds (references to SavedAddress)
  productTag: string[];
  variants?: IVariant[];
  marketplaceOptions?: IMarketplaceOptions;
  pickupHours?: IPickupHours | string;  // Can be object or string
  shippingPrice?: number;
  readyByDate?: Date;
  readyByTime?: string;
  discount?: IDiscount;
  images: string[];
  status: ProductStatus;
  seller: Types.ObjectId;
  dimensions?: IDimensions;  // New field for product dimensions
  availabilityRadius?: number;  // New field for delivery radius
  views?: number;
  likes?: number;
  rating?: number;
  totalReviews?: number;
  sold?: number;
  featured?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IProduct extends IProductBase, Document {
  _id: Types.ObjectId;
  calculateDiscountedPrice(): number;
  calculateVariantPrice(variantIndex: number): number;
  isAvailable(): boolean;
  incrementView(): Promise<void>;
  incrementLike(): Promise<void>;
  decrementQuantity(amount: number): Promise<void>;
  toJSON(): any;
}

export interface IProductMethods {
  calculateDiscountedPrice(): number;
  calculateVariantPrice(variantIndex: number): number;
  isAvailable(): boolean;
  incrementView(): Promise<void>;
  incrementLike(): Promise<void>;
  decrementQuantity(amount: number): Promise<void>;
}

export interface IProductStatics {
  findByCategory(category: string): Promise<IProduct[]>;
  findBySeller(sellerId: Types.ObjectId): Promise<IProduct[]>;
  findFeatured(): Promise<IProduct[]>;
  searchProducts(query: string): Promise<IProduct[]>;
  updateStock(productId: Types.ObjectId, quantity: number): Promise<IProduct | null>;
}

export interface IProductModel extends Model<IProduct, {}, IProductMethods>, IProductStatics {}

export interface CreateProductDTO {
  title: string;
  price: number;
  description: string;
  category: string;
  subCategory: string;
  quantity: number;
  brand: string;
  color: string;
  locationIds: string[];  // Array of SavedAddress IDs
  productTag: string[];
  variants?: IVariant[];
  marketplaceOptions?: IMarketplaceOptions;
  pickupHours?: IPickupHours | string;
  shippingPrice?: number;
  readyByDate?: Date;
  readyByTime?: string;
  discount?: IDiscount;
  images?: string[];
  status?: ProductStatus;
  seller: Types.ObjectId;
  dimensions?: IDimensions;
  availabilityRadius?: number;
}

export interface UpdateProductDTO {
  title?: string;
  price?: number;
  description?: string;
  category?: string;
  subCategory?: string;
  quantity?: number;
  brand?: string;
  color?: string;
  locationIds?: string[];  // Array of SavedAddress IDs
  productTag?: string[];
  variants?: IVariant[];
  marketplaceOptions?: IMarketplaceOptions;
  pickupHours?: IPickupHours | string;
  shippingPrice?: number;
  readyByDate?: Date;
  readyByTime?: string;
  discount?: IDiscount;
  images?: string[];
  status?: ProductStatus;
  dimensions?: IDimensions;
  availabilityRadius?: number;
}

export interface ProductFilterDTO {
  category?: string;
  subCategory?: string;
  minPrice?: number;
  maxPrice?: number;
  brand?: string;
  color?: string;
  tags?: string[];
  seller?: Types.ObjectId;
  status?: ProductStatus;
  featured?: boolean;
  search?: string;
  sort?: string;
  page?: number;
  limit?: number;
  // Location-based filtering
  latitude?: number;
  longitude?: number;
  maxDistance?: number;
  city?: string;
  state?: string;
  country?: string;
}