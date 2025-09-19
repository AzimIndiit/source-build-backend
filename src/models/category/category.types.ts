import { Document, Types } from 'mongoose';

export interface ICategory {
  name: string;
  description?: string;
  image?: string;
  slug: string;
  isActive: boolean;
  order?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ICategoryMethods {
  // Remove toJSON as it's already in Document
}

export interface ICategoryDocument extends ICategory, ICategoryMethods, Document {
  _id: Types.ObjectId;
}

// For static methods
export interface ICategoryModel extends Document {
  findBySlug(slug: string): Promise<ICategoryDocument | null>;
  findActive(): Promise<ICategoryDocument[]>;
}