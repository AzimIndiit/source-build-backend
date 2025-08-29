import { z } from 'zod';
import { OtpType } from './otp.types.js';

/**
 * OTP creation schema validator
 */
export const createOtpSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .toLowerCase()
    .transform(val => val.trim()),
  type: z.nativeEnum(OtpType, {
    errorMap: () => ({ message: 'Invalid OTP type. Must be UR, FP, or UU' }),
  }),
  path: z.string().optional(),
});

/**
 * OTP verification schema validator
 */
export const verifyOtpSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .toLowerCase()
    .transform(val => val.trim()),
  otp: z
    .string()
    .length(6, 'OTP must be exactly 6 digits')
    .regex(/^\d{6}$/, 'OTP must contain only numbers'),
  type: z.nativeEnum(OtpType, {
    errorMap: () => ({ message: 'Invalid OTP type. Must be UR, FP, or UU' }),
  }),
  path: z.string().optional(),
});

/**
 * OTP resend schema validator
 */
export const resendOtpSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .toLowerCase()
    .transform(val => val.trim()),
  type: z.nativeEnum(OtpType, {
    errorMap: () => ({ message: 'Invalid OTP type. Must be UR, FP, or UU' }),
  }),
});

/**
 * Type exports for use in TypeScript
 */
export type CreateOtpInput = z.infer<typeof createOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type ResendOtpInput = z.infer<typeof resendOtpSchema>;