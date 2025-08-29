import { Document, Model } from 'mongoose';

/**
 * Address type enumeration
 */
export enum AddressType {
  BILLING = 'billing',
  SHIPPING = 'shipping',
  BOTH = 'both',
}

/**
 * Address interface
 */
export interface IAddress {
  _id?: string;
  userId: string;
  label?: string;
  street: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
  isDefault: boolean;
  type: AddressType;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Address document interface (extends IAddress with Mongoose Document methods)
 */
export interface IAddressDocument extends Omit<IAddress, '_id'>, Document {}

/**
 * Address model interface
 */
export interface IAddressModel extends Model<IAddressDocument> {
  // Static methods can be added here
  findByUserId(userId: string): Promise<IAddressDocument[]>;
  findDefaultByUserId(userId: string, type?: AddressType): Promise<IAddressDocument | null>;
  setDefaultAddress(userId: string, addressId: string, type?: AddressType): Promise<void>;
}

/**
 * Create address data interface
 */
export interface ICreateAddressData {
  userId: string;
  label?: string;
  street: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
  isDefault: boolean;
  type: AddressType;
}

/**
 * Update address data interface
 */
export interface IUpdateAddressData {
  label?: string;
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  isDefault?: boolean;
  type?: AddressType;
  isActive?: boolean;
}

/**
 * Address query interface
 */
export interface IAddressQuery {
  userId?: string;
  type?: AddressType;
  isDefault?: boolean;
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
