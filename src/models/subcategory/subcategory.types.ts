import { Document, Types } from 'mongoose';

export interface ISubcategory {
  name: string;
  description?: string;
  image?: string;
  slug: string;
  category: Types.ObjectId;
  isActive: boolean;
  order?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ISubcategoryMethods {
  // Remove toJSON as it's already in Document
}

export interface ISubcategoryDocument extends ISubcategory, ISubcategoryMethods, Document {
  _id: Types.ObjectId;
}

// For static methods
export interface ISubcategoryModel extends Document {
  findBySlug(slug: string): Promise<ISubcategoryDocument | null>;
  findActive(): Promise<ISubcategoryDocument[]>;
  findByCategory(categoryId: string): Promise<ISubcategoryDocument[]>;
}