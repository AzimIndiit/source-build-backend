import { Model, Types } from 'mongoose';
import { IProduct, ProductStatus } from '@models/product/product.types.js';

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
  
  if (quantity === 0) {
    product.status = ProductStatus.OUT_OF_STOCK;
  } else if (product.status === ProductStatus.OUT_OF_STOCK) {
    product.status = ProductStatus.ACTIVE;
  }
  
  await product.save();
  return product;
}