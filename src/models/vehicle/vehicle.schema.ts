import mongoose, { Schema, Document } from 'mongoose';

export interface IVehicle extends Document {
  userId: mongoose.Types.ObjectId;
  vehicleType: string;
  vehicleManufacturer: string;
  vehicleModel: string;
  vehicleRegistrationNumber: string;
  vehicleImages: string[];
  insuranceImages: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Export vehicle types for use in other files
export { VehicleType, VehicleManufacturer } from './vehicle.validators.js';

const vehicleSchema = new Schema<IVehicle>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    vehicleType: {
      type: String,
      required: true,
    },
    vehicleManufacturer: {
      type: String,
      required: true,
    },
    vehicleModel: {
      type: String,
      required: true,
    },
    vehicleRegistrationNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    vehicleImages: {
      type: [String],
      default: [],
      validate: {
        validator: function(v: string[]) {
          return v.length <= 5;
        },
        message: 'Maximum 5 vehicle images allowed'
      }
    },
    insuranceImages: {
      type: [String],
      default: [],
      validate: {
        validator: function(v: string[]) {
          return v.length <= 2;
        },
        message: 'Maximum 2 insurance images allowed'
      }
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
vehicleSchema.index({ userId: 1, isActive: 1 });
vehicleSchema.index({ vehicleRegistrationNumber: 1 });

// Virtual for formatted display name
vehicleSchema.virtual('displayName').get(function() {
  return `${this.vehicleManufacturer} ${this.vehicleModel} (${this.vehicleRegistrationNumber})`;
});

// Ensure JSON output includes virtuals
vehicleSchema.set('toJSON', { virtuals: true });

const VehicleModal = mongoose.model<IVehicle>('Vehicle', vehicleSchema);

export default VehicleModal;