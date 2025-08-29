import crypto from 'crypto';
import UserModal from '@/models/user/user.model.js';
import { OtpType, type CreateOtpInput, type VerifyOtpInput } from '@/models/otp/otp.types.js';
import ApiError from '@/utils/ApiError.js';
import emailService from './email.service.js';
import OtpModal from '@/models/otp/otp.model.js';

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 5;
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_OTPS_PER_HOUR = 5;

/**
 * Generate a random 6-digit OTP (always exactly 6 digits, zero-padded if needed)
 */
const generateOtpCode = (): string => {
  const max = 10 ** OTP_LENGTH;
  const otp = crypto.randomInt(0, max);
  return otp.toString().padStart(OTP_LENGTH, '0');
};

/**
 * Create and send OTP
 */
const createOtp = async (data: CreateOtpInput): Promise<{ message: string; otpSent: boolean }> => {
  const { email, type } = data;

  // Check if user exists
  const user = await UserModal.findByEmail(email);
  if (!user) {
    throw ApiError.notFound('User not found');
  }

  // Check if email is already verified for registration OTP
  if (type === OtpType.USER_REGISTRATION && user.isEmailVerified) {
    return {
      message: 'Email already verified',
      otpSent: false,
    };
  }

  // Check resend cooldown (1 minute)
  const oneMinuteAgo = new Date(Date.now() - RESEND_COOLDOWN_SECONDS * 1000);
  const recentOtp = await OtpModal.findOne({
    email,
    type,
    createdAt: { $gt: oneMinuteAgo },
  }).sort({ createdAt: -1 });

  if (recentOtp) {
    const waitTime = Math.ceil((RESEND_COOLDOWN_SECONDS - 
      (Date.now() - recentOtp.createdAt!.getTime()) / 1000));
    throw ApiError.tooManyRequests(
      `Please wait ${waitTime} seconds before requesting another OTP`
    );
  }

  // Check rate limit (5 OTPs per hour)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const otpCount = await OtpModal.countDocuments({
    email,
    type,
    createdAt: { $gte: oneHourAgo },
  });

  if (otpCount >= MAX_OTPS_PER_HOUR) {
    throw ApiError.tooManyRequests(
      'You have reached the maximum OTP request limit. Please try after an hour.'
    );
  }

  // Generate and save OTP
  const otpCode = generateOtpCode();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await OtpModal.create({
    email,
    otp: otpCode,
    type,
    expiresAt,
  });

  const emailData: any = {
    sender: "mohdazimindiit@gmail.com",
    email,
    subject: "OTP Verification",
    otp: otpCode,
  };

  await emailService.sendEmail(emailData, "otp.ejs");

  return {
    message: `OTP sent successfully to ${email}`,
    otpSent: true,
  };
};

/**
 * Verify OTP
 */
const verifyOtp = async (data: VerifyOtpInput): Promise<{
  verified: boolean;
  user?: any;
}> => {
  const { email, otp, type } = data;

  // Find and verify OTP
  const otpDoc = await OtpModal.verifyOtp(email, otp, type);
  
  if (!otpDoc) {
    throw ApiError.badRequest('Invalid or expired OTP');
  }

  // Handle post-verification actions based on type
  if (type === OtpType.USER_REGISTRATION) {
    const user = await UserModal.findOneAndUpdate(
      { email },
      { 
        isEmailVerified: true,
        status: 'active',
      },
      { new: true }
    );

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    return {
      verified: true,
      user: user.toJSON(),
    };
  }

  return {
    verified: true,
  };
};

/**
 * Resend OTP
 */
const resendOtp = async (email: string, type: OtpType): Promise<{ message: string; otpSent: boolean }> => {
  return createOtp({ email, type });
};

/**
 * Get email template based on OTP type
 */
const getEmailTemplate = (type: OtpType): { subject: string; action: string } => {
  switch (type) {
    case OtpType.USER_REGISTRATION:
      return {
        subject: 'Verify Your Email - Source Build',
        action: 'verify your email address',
      };
    case OtpType.FORGOT_PASSWORD:
      return {
        subject: 'Reset Your Password - Source Build',
        action: 'reset your password',
      };
    case OtpType.UPDATE_USER:
      return {
        subject: 'Confirm Profile Update - Source Build',
        action: 'confirm your profile update',
      };
    default:
      return {
        subject: 'OTP Verification - Source Build',
        action: 'complete verification',
      };
  }
};

/**
 * Clean up expired OTPs (can be run as a cron job)
 */
const cleanupExpiredOtps = async (): Promise<void> => {
  await OtpModal.cleanupExpiredOtps();
};

export default {
  createOtp,
  verifyOtp,
  resendOtp,
  cleanupExpiredOtps,
};