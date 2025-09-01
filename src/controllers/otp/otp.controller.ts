import { Request, Response } from 'express'
import otpService from '@/services/otp.service.js'
import User from '@/models/user/user.model.js'
import { OtpType } from '@/models/otp/otp.types.js'
import { createOtpSchema, verifyOtpSchema, resendOtpSchema } from '@/models/otp/otp.validators.js'
import { validate } from '@/middlewares/validation.middleware.js'
import ApiResponse from '@/utils/ApiResponse.js'
import ApiError from '@/utils/ApiError.js'
import catchAsync from '@/utils/catchAsync.js'
import logger from '@/config/logger.js'
import config from '@/config/index.js'
import { createNotificationService } from '@/services/notification.service.js'
import { getMessage } from '@/utils/getMessage.js'
import UserModal from '@/models/user/user.model.js'
import emailService from '@/services/email.service.js'

/**
 * Create and send OTP
 */
export const createOtp = [
  validate(createOtpSchema),
  catchAsync(async (req: Request, res: Response) => {
    const { email, type } = req.body

    logger.info('OTP creation attempt', {
      email,
      type,
      ip: req.ip,
    })

    const result = await otpService.createOtp({
      email,
      type,
    })

   

    logger.info('OTP created successfully', { email, type })

    return ApiResponse.success(res, result, result.message)
  }),
]

/**
 * Verify OTP
 */
export const verifyOtp = [
  validate(verifyOtpSchema),
  catchAsync(async (req: Request, res: Response) => {
    const { email, otp, type } = req.body

    logger.info('OTP verification attempt', {
      email,
      type,
      ip: req.ip,
    })

    const result = await otpService.verifyOtp({
      email,
      otp,
      type,
    })

    // For user registration, generate tokens and complete the flow
    if (type === OtpType.USER_REGISTRATION && result.user) {
      const user = await User.findByEmail(email)

      if (!user) {
        throw ApiError.notFound('User not found')
      }

      // Set user as online
      user.set('isOnline', true)
      await user.save()

      if (type === 'UR') {
       
        // Send welcome notification
        await createNotificationService({
          userId: user._id as string,
          type: 'WELCOME',
          title: 'Welcome to Source Build!',
          message: getMessage('WELCOME', user.role.toLowerCase() as 'seller' | 'buyer' | 'driver'),
        })

          // Send welcome email
    try {
      await emailService.sendWelcomeEmail(user.email, user.displayName || 'User');
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Don't throw error here as registration was successful
    }
      }

      // Generate tokens
      const tokens = {
        accessToken: user.generateAccessToken(),
        refreshToken: user.generateRefreshToken(),
        expiresIn: 900, // 15 minutes
      }

      // Add refresh token to user
      await user.addRefreshToken(tokens.refreshToken)

      // Set authentication cookies
      const isProduction = config.NODE_ENV === 'production'

      res.cookie('accessToken', tokens.accessToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'strict' : 'lax',
        maxAge: 15 * 60 * 1000, // 15 minutes
      })

      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'strict' : 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      })

      logger.info('User verified and logged in successfully', {
        userId: user._id,
        email: user.email,
      })

      return ApiResponse.success(
        res,
        {
          user: result.user,
          tokens,
          isVerified: true,
        },
        'Email verified successfully'
      )
    }

    logger.info('OTP verified successfully', { email, type })

    return ApiResponse.success(res, { isVerified: true }, 'OTP verified successfully')
  }),
]

/**
 * Resend OTP
 */
export const resendOtp = [
  validate(resendOtpSchema),
  catchAsync(async (req: Request, res: Response) => {
    const { email, type } = req.body

    logger.info('OTP resend attempt', {
      email,
      type,
      ip: req.ip,
    })

    const result = await otpService.resendOtp(email, type)

    logger.info('OTP resent successfully', { email, type })

    return ApiResponse.success(res, result, result.message)
  }),
]

/**
 * Health check endpoint
 */
export const healthCheck = catchAsync(async (req: Request, res: Response) => {
  return ApiResponse.success(
    res,
    {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'otp-service',
    },
    'Service is healthy'
  )
})

export default {
  createOtp,
  verifyOtp,
  resendOtp,
  healthCheck,
}
