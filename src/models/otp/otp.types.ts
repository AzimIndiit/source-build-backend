import { Document, Model } from 'mongoose';

/**
 * OTP type enumeration
 */
export enum OtpType {
  USER_REGISTRATION = 'UR', // User Registration
  FORGOT_PASSWORD = 'FP',   // Forgot Password
  UPDATE_USER = 'UU',        // Update User
}

/**
 * Base OTP interface (without Document)
 */
export interface IOtpBase {
  email: string;
  otp: string;
  type: OtpType;
  expiresAt: Date;
  isVerified: boolean;
  createdAt?: Date;
}

/**
 * OTP document interface (with Mongoose Document)
 */
export interface IOtp extends IOtpBase, Document {
  isExpired(): boolean;
}

/**
 * OTP model interface with static methods
 */
export interface IOtpModel extends Model<IOtp> {
  findLatestOtp(email: string, type: OtpType): Promise<IOtp | null>;
  countRecentOtps(email: string, type: OtpType, minutes: number): Promise<number>;
  verifyOtp(email: string, otp: string, type: OtpType): Promise<IOtp | null>;
  cleanupExpiredOtps(): Promise<void>;
}

/**
 * OTP creation input
 */
export interface CreateOtpInput {
  email: string;
  type: OtpType;
  path?: string;
}

/**
 * OTP verification input
 */
export interface VerifyOtpInput {
  email: string;
  otp: string;
  type: OtpType;
  path?: string;
}