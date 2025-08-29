import { Schema } from 'mongoose';
import { IAddressDocument, IAddressModel, AddressType } from './address.types.js';

/**
 * Address schema for MongoDB
 */
export const addressSchema = new Schema<IAddressDocument, IAddressModel>(
  {
    userId: {
      type: String,
      required: [true, 'User ID is required'],
      index: true,
    },
    label: {
      type: String,
      trim: true,
      maxlength: [50, 'Label cannot exceed 50 characters'],
    },
    street: {
      type: String,
      required: [true, 'Street address is required'],
      trim: true,
      maxlength: [200, 'Street address cannot exceed 200 characters'],
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
      maxlength: [100, 'City cannot exceed 100 characters'],
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      trim: true,
      maxlength: [100, 'State cannot exceed 100 characters'],
    },
    country: {
      type: String,
      required: [true, 'Country is required'],
      trim: true,
      maxlength: [100, 'Country cannot exceed 100 characters'],
    },
    zipCode: {
      type: String,
      required: [true, 'ZIP code is required'],
      trim: true,
      maxlength: [20, 'ZIP code cannot exceed 20 characters'],
    },
    isDefault: {
      type: Boolean,
      default: false,
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(AddressType),
      default: AddressType.BOTH,
      required: [true, 'Address type is required'],
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound indexes for efficient querying
addressSchema.index({ userId: 1, type: 1 });
addressSchema.index({ userId: 1, isDefault: 1 });
addressSchema.index({ userId: 1, isActive: 1 });

// Text index for search functionality
addressSchema.index({
  street: 'text',
  city: 'text',
  state: 'text',
  country: 'text',
  zipCode: 'text',
});

/**
 * Pre-save middleware to handle default address logic
 */
addressSchema.pre('save', async function (next) {
  // If this address is being set as default, unset other default addresses
  if (this.isDefault && this.isModified('isDefault')) {
    await (this.constructor as any).updateMany(
      {
        userId: this.userId,
        type: this.type,
        _id: { $ne: this._id },
        isDefault: true,
      },
      { isDefault: false }
    );
  }
  
  next();
});

/**
 * Pre-update middleware to handle default address logic
 */
addressSchema.pre(['updateOne', 'findOneAndUpdate', 'updateMany'], async function (next) {
  const update = this.getUpdate() as any;
  
  if (update.isDefault) {
    const filter = this.getFilter();
    await this.model.updateMany(
      {
        userId: (filter as any).userId,
        type: (filter as any).type || update.type,
        _id: { $ne: filter._id },
        isDefault: true,
      },
      { isDefault: false }
    );
  }
  
  next();
});

/**
 * Static method to find addresses by user ID
 */
(addressSchema.statics as any).findByUserId = async function (userId: string) {
  return this.find({ userId, isActive: true }).sort({ isDefault: -1, createdAt: -1 });
};

/**
 * Static method to find default address by user ID and type
 */
(addressSchema.statics as any).findDefaultByUserId = async function (userId: string, type?: AddressType) {
  const filter: any = { userId, isDefault: true, isActive: true };
  if (type) {
    filter.type = type;
  }
  return this.findOne(filter);
};

/**
 * Static method to set an address as default
 */
(addressSchema.statics as any).setDefaultAddress = async function (userId: string, addressId: string, type?: AddressType) {
  const address = await this.findById(addressId);
  if (!address || address.userId !== userId) {
    throw new Error('Address not found or unauthorized');
  }

  // Unset other default addresses of the same type
  const filter: any = { userId, isDefault: true, isActive: true };
  if (type) {
    filter.type = type;
  } else {
    filter.type = address.type;
  }
  
  await this.updateMany(
    { ...filter, _id: { $ne: addressId } },
    { isDefault: false }
  );

  // Set this address as default
  await this.findByIdAndUpdate(addressId, { isDefault: true });
};
