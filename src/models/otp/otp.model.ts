import mongoose, { Schema } from 'mongoose';
import type { IOtp, IOtpModel, OtpType } from './otp.types.js';

/**
 * OTP Schema definition
 */
const otpSchema = new Schema<IOtp>(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
    },
    otp: {
      type: String,
      required: [true, 'OTP is required'],
      length: 6,
    },
    type: {
      type: String,
      enum: ['UR', 'FP', 'UU'],
      required: [true, 'OTP type is required'],
    },
    expiresAt: {
      type: Date,
      required: [true, 'Expiry date is required'],
      index: { expireAfterSeconds: 0 }, // Auto-delete expired documents
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: {
      createdAt: 'createdAt',
      updatedAt: false,
    },
  }
);

// Indexes for performance
otpSchema.index({ email: 1, type: 1, createdAt: -1 });
otpSchema.index({ email: 1, type: 1, isVerified: 1 });

// Instance methods
const methods = otpSchema.methods as any;

/**
 * Instance method to check if OTP is expired
 */
methods.isExpired = function (): boolean {
  return Date.now() > this.expiresAt.getTime();
};

// Static methods
const statics = otpSchema.statics as any;

/**
 * Static method to find the latest OTP for a user
 */
statics.findLatestOtp = async function (
  email: string,
  type: OtpType
): Promise<IOtp | null> {
  return this.findOne({
    email: email.toLowerCase(),
    type,
    isVerified: false,
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 });
};

/**
 * Static method to count recent OTPs
 */
statics.countRecentOtps = async function (
  email: string,
  type: OtpType,
  minutes: number
): Promise<number> {
  const timeAgo = new Date(Date.now() - minutes * 60 * 1000);
  return this.countDocuments({
    email: email.toLowerCase(),
    type,
    createdAt: { $gte: timeAgo },
  });
};

/**
 * Static method to verify OTP
 */
statics.verifyOtp = async function (
  email: string,
  otp: string,
  type: OtpType
): Promise<IOtp | null> {
  const otpDoc = await this.findOne({
    email: email.toLowerCase(),
    type,
    otp,
    isVerified: false,
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 });

  if (otpDoc) {
    otpDoc.isVerified = true;
    await otpDoc.save();
    return otpDoc;
  }

  return null;
};

/**
 * Static method to cleanup expired OTPs
 */
statics.cleanupExpiredOtps = async function (): Promise<void> {
  await this.deleteMany({
    expiresAt: { $lt: new Date() },
  });
};

// Create and export the model
const OtpModal = mongoose.model<IOtp, IOtpModel>('Otp', otpSchema);

export default OtpModal;