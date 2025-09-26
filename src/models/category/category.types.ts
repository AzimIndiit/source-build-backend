import { Document, Types } from 'mongoose';

export interface IAttribute {
  name: string;
  inputType: 'text' | 'number' | 'dropdown' | 'multiselect' | 'boolean' | 'radio';
  required?: boolean;
  values?: { value: string; order?: number }[];
  order?: number;
  isActive?: boolean;
}

export interface ICategory {
  name: string;
  description?: string;
  image?: string;
  slug: string;
  isActive: boolean;
  order?: number;
  hasAttributes?: boolean;
  attributes?: IAttribute[];
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