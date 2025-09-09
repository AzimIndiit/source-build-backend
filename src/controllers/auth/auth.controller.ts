// @ts-nocheck
import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import authService, { IRegisterData, ILoginCredentials } from '@services/auth.service.js'
import UserModal, { IUser, UserRole } from '@/models/user/user.model.js'
import {
  registerUserSchema,
  loginUserSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '@/models/user/user.validators.js'
import { validate } from '@middlewares/validation.middleware.js'
import ApiError from '@utils/ApiError.js'
import ApiResponse from '@utils/ApiResponse.js'
import catchAsync from '@utils/catchAsync.js'
import logger from '@config/logger.js'
import config from '@config/index.js'
import passport from 'passport'
import { getMessage } from '@/utils/getMessage.js'
import { createNotificationService } from '@/services/notification.service.js'

/**
 * Format user response payload
 * Helper function to create consistent user response objects based on role
 */
export const formatUserResponse = (user: IUser) => {
  const userProfile = user.profile as any

  // Base fields common to all users
  const baseResponse: any = {
    id: user._id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    displayName: user.displayName,
    role: user.role,
    accountType: user.role, // For compatibility
    isVerified: user.isVerified,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    avatar: userProfile?.avatar,
    currentLocationId: user.currentLocationId,
    currentLocation: (user as any).currentLocation || null, // Include populated location
    authType: user.authType,
  }

  // Add role-specific fields based on user role
  switch (user.role) {
    case UserRole.SELLER:
      return {
        ...baseResponse,
        phone: userProfile?.phone,
        businessName: userProfile?.businessName,
        businessAddress: userProfile?.businessAddress || userProfile?.address,
        cellPhone: userProfile?.cellPhone,
        localDelivery: userProfile?.localDelivery,
        einNumber: userProfile?.einNumber,
        salesTaxId: userProfile?.salesTaxId,
        region: userProfile?.region,
        address: userProfile?.address,
        description: userProfile?.description,
      }

    case UserRole.DRIVER:
      console.log('userProfile', userProfile)
      return {
        ...baseResponse,
        phone: userProfile?.phone,
        address: userProfile?.address,
        isVehicles: userProfile?.isVehicles,
        isLicense: userProfile?.isLicense,
      }

    case UserRole.BUYER:
      return {
        ...baseResponse,
        address: userProfile?.address,
        region: userProfile?.region,
      }

    case UserRole.ADMIN:
      return {
        ...baseResponse,
        phone: user.phone,
        department: userProfile?.department,
        adminLevel: userProfile?.adminLevel,
        lastLoginIP: userProfile?.lastLoginIP,
        twoFactorEnabled: userProfile?.twoFactorEnabled || false,
      }

    default:
      // Fallback for any other roles
      return {
        ...baseResponse,
        phone: user.phone,
        address: userProfile?.address,
      }
  }
}

/**
 * Set authentication cookies
 */
const setAuthCookies = (res: Response, tokens: { accessToken: string; refreshToken: string }) => {
  const isProduction = config.NODE_ENV === 'production'

  // Set access token cookie (shorter expiration)
  res.cookie('accessToken', tokens.accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: 15 * 60 * 1000, // 15 minutes
  })

  // Set refresh token cookie (longer expiration)
  res.cookie('refreshToken', tokens.refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  })
}

/**
 * Clear authentication cookies
 */
const clearAuthCookies = (res: Response) => {
  res.clearCookie('accessToken')
  res.clearCookie('refreshToken')
}

/**
 * Register a new user with role-specific validation
 */
export const register = [
  catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    // First, determine the role to use the appropriate validation
    const { role } = req.body
    // Enhanced validation with better error messages
    try {
      console.log('req.body', req.body)
      const validated = await registerUserSchema.parseAsync(req.body)
      req.body = validated
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Enhanced error formatting with more specific messages
        const formattedErrors = error.errors.map((err) => {
          let message = err.message
          let field = err.path.join('.')

          // Provide more helpful error messages for common cases
          if (err.code === 'invalid_union') {
            // Check what fields are missing based on the role
            if (role === 'buyer') {
              if (!req.body.firstName) {
                message = 'First name is required for buyer registration'
                field = 'firstName'
              } else if (!req.body.lastName) {
                message = 'Last name is required for buyer registration'
                field = 'lastName'
              } else if (!req.body.confirmPassword) {
                message = 'Confirm password is required'
                field = 'confirmPassword'
              } else if (req.body.termsAccepted !== true) {
                message = 'You must accept the terms and conditions'
                field = 'termsAccepted'
              }
            } else if (role === 'seller') {
              if (!req.body.firstName) {
                message = 'First name is required for seller registration'
                field = 'firstName'
              } else if (!req.body.lastName) {
                message = 'Last name is required for seller registration'
                field = 'lastName'
              } else if (!req.body.businessName) {
                message = 'Business name is required for seller registration'
                field = 'businessName'
              } else if (!req.body.einNumber) {
                message = 'EIN number is required for seller registration'
                field = 'einNumber'
              } else if (req.body.localDelivery === false && !req.body.salesTaxId) {
                message = 'Sales Tax ID is required for seller registration'
                field = 'salesTaxId'
              } else if (!req.body.phone) {
                message = 'Phone number is required for seller registration'
                field = 'phone'
              }
            } else if (role === 'driver') {
              if (!req.body.firstName) {
                message = 'First name is required for driver registration'
                field = 'firstName'
              } else if (!req.body.lastName) {
                message = 'Last name is required for driver registration'
                field = 'lastName'
              } else if (!req.body.phone) {
                message = 'Phone number is required for driver registration'
                field = 'phone'
              }
            }
          }

          return {
            field: field || err.path.join('.'),
            message: message,
            code: err.code,
          }
        })

        return next(ApiError.validationError('Validation failed', formattedErrors))
      }
      return next(error)
    }

    logger.info('User registration attempt', {
      email: req.body.email,
      role: role,
      ip: req.ip,
    })

    // Build registration data based on role
    let registerData: IRegisterData

    switch (role) {
      case UserRole.BUYER:
        registerData = {
          email: req.body.email,
          password: req.body.password,
          role: UserRole.BUYER,
          profile: {
            role: UserRole.BUYER,
            addresses: [],
          } as any,
          termsAccepted: true,
        }
        break

      case UserRole.SELLER:
        registerData = {
          email: req.body.email,
          password: req.body.password,
          role: UserRole.SELLER,
          profile: {
            role: UserRole.SELLER,
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            businessName: req.body.businessName,
            einNumber: req.body.einNumber,
            salesTaxId: req.body.salesTaxId,
            businessAddress: req.body.businessAddress,
            localDelivery: req.body.localDelivery === true || req.body.localDelivery === 'yes',
            phone: req.body.phone,
            cellPhone: req.body.cellPhone,
            addresses: [],
          } as any,
          termsAccepted: true,
        }
        break

      case UserRole.DRIVER:
        registerData = {
          email: req.body.email,
          password: req.body.password,
          role: UserRole.DRIVER,
          profile: {
            role: UserRole.DRIVER,
            phone: req.body.phone,

            addresses: [],
            driverLicense: {
              number: req.body.driverLicenseNumber,
              verified: false,
              licenceImages: req.body.licenceImages,
            },
            vehicles: [
              {
                type: req.body.vehicleType,
                make: req.body.vehicleMake,
                model: req.body.vehicleModel,
                vehicleImages: req.body.vehicleImages,
                insuranceImages: req.body.insuranceImages,
                registrationNumber: req.body.vehicleRegistrationNumber,
              },
            ],
          } as any,
          termsAccepted: true,
        }
        break

      case UserRole.ADMIN:
        // Admin creation should be handled separately with higher security
        return next(ApiError.forbidden('Admin registration is not allowed through this endpoint'))

      default:
        return next(ApiError.badRequest('Invalid account type'))
    }
    console.log('registerData', registerData)
    registerData = { ...registerData, firstName: req.body.firstName, lastName: req.body.lastName }
    // Register the user
    const { user, otpSent } = await authService.register(registerData)

    // // Notify admins about new user
    // await notifyAdminsNewUser(user);
    // logger.info('User registered successfully', {
    //   userId: user._id,
    //   email: user.email,
    //   role: user.role
    // });

    const userResponse = formatUserResponse(user)

    return ApiResponse.created(
      res,
      {
        user: userResponse,
        otpSent,
      },
      'Registration successful. Please verify your email.'
    )
  }),
]

/**
 * Login user
 */
export const login = [
  validate(loginUserSchema),
  catchAsync(async (req: Request, res: Response) => {
    logger.info('User login attempt', {
      email: req.body.email,
      ip: req.ip,
    })

    const credentials: ILoginCredentials = {
      email: req.body.email,
      password: req.body.password,
      rememberMe: req.body.rememberMe || false,
    }

    const { user, tokens } = await authService.login(credentials)

    // Set authentication cookies with extended expiry if rememberMe is true
    const isProduction = config.NODE_ENV === 'production'
    const rememberMe = req.body.rememberMe || false

    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: rememberMe ? 7 * 24 * 60 * 60 * 1000 : 15 * 60 * 1000, // 7 days or 15 minutes
    })

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000, // 30 days or 1 day
    })

    logger.info('User logged in successfully', { userId: user._id, email: user.email })

    const userResponse = formatUserResponse(user)
    console.log('userResponse', user, userResponse)
    return ApiResponse.success(
      res,
      {
        user: userResponse,
        tokens,
      },
      'Login successful'
    )
  }),
]

/**
 * Refresh access token
 */
export const refreshToken = catchAsync(async (req: Request, res: Response) => {
  const refreshToken = req.body.refreshToken || req.cookies.refreshToken

  if (!refreshToken) {
    throw ApiError.unauthorized('Refresh token is required')
  }

  const tokens = await authService.refreshToken(refreshToken)

  // Update cookies with new tokens
  setAuthCookies(res, tokens)

  logger.info('Token refreshed successfully')

  return ApiResponse.success(res, { tokens }, 'Token refreshed successfully')
})

/**
 * Logout user
 */
export const logout = catchAsync(async (req: Request, res: Response) => {
  const userId = req.userId!
  // Safely access refresh token from body or cookies
  const refreshToken = req.body?.refreshToken || req.cookies?.refreshToken || null

  // Call logout service - it should handle null refresh token gracefully
  if (refreshToken) {
    await authService.logout(userId, refreshToken)
  } else {
    // Just log out without invalidating specific token
    await authService.logoutFromAllDevices(userId)
  }

  // Clear authentication cookies
  clearAuthCookies(res)

  logger.info('User logged out successfully', { userId })

  return ApiResponse.success(res, null, 'Logout successful')
})

/**
 * Logout from all devices
 */
export const logoutFromAllDevices = catchAsync(async (req: Request, res: Response) => {
  const userId = req.userId!

  await authService.logoutFromAllDevices(userId)

  // Clear authentication cookies
  clearAuthCookies(res)

  logger.info('User logged out from all devices', { userId })

  return ApiResponse.success(res, null, 'Logged out from all devices successfully')
})

/**
 * Request password reset
 */
export const requestPasswordReset = [
  validate(forgotPasswordSchema),
  catchAsync(async (req: Request, res: Response) => {
    const { email } = req.body
    const isUserExists = await UserModal.findOne({ email })
    if (!isUserExists) {
      return ApiResponse.badRequest(res, 'Account not found!. Please register first.')
    }
    const resetToken = await authService.generatePasswordResetToken(email)

    // In a real application, you would send this token via email
    // For development/testing, we'll return it in the response
    const responseData = config.NODE_ENV === 'development' ? { resetToken } : null

    logger.info('Password reset requested', { email })

    return ApiResponse.success(
      res,
      responseData,
      'If an account with that email exists, a password reset link has been sent'
    )
  }),
]

/**
 * Verify reset token
 */
export const verifyResetToken = catchAsync(async (req: Request, res: Response) => {
  const { token } = req.body

  if (!token || typeof token !== 'string') {
    return ApiResponse.badRequest(res, 'Token is required')
  }

  const result = await authService.verifyResetToken(token)

  if (result.valid) {
    return ApiResponse.success(res, { valid: true }, result.message || 'Token is valid')
  } else {
    return ApiResponse.badRequest(res, result.message || 'Invalid or expired token')
  }
})

/**
 * Reset password
 */
export const resetPassword = [
  validate(resetPasswordSchema),
  catchAsync(async (req: Request, res: Response) => {
    const { token, password } = req.body

    await authService.resetPassword(token, password)

    logger.info('Password reset successfully')

    return ApiResponse.success(
      res,
      null,
      'Password reset successfully. Please login with your new password.'
    )
  }),
]

/**
 * Google OAuth login with role selection
 */
export const googleLogin = (req: Request, res: Response, next: NextFunction) => {
  // Role is optional for login - only required for signup
  const role = req.query['role'] as UserRole | undefined

  // If role is provided, validate it
  if (role) {
    if (!Object.values(UserRole).includes(role)) {
      return ApiResponse.badRequest(res, 'Invalid role parameter. Must be buyer, seller, or driver')
    }

    if (role === UserRole.ADMIN) {
      return ApiResponse.forbidden(res, 'Admin registration via Google is not allowed')
    }
  }

  logger.info('Google OAuth login attempt', {
    ip: req.ip,
    role: role || 'not-specified',
  })

  // Store role in session if provided
  if (role) {
    ;(req.session as any).role = role
  }

  // Initiate Google OAuth flow
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    state: role || '', // Pass role as state parameter if provided
  })(req, res, next)
}

/**
 * Google OAuth callback
 */
export const googleCallback = [
  passport.authenticate('google', { failureRedirect: '/api/v1/auth/google/failure' }),
  catchAsync(async (req: Request, res: Response) => {
    if (!req.user) {
      return ApiResponse.unauthorized(res, 'Google authentication failed')
    }

    const user = req.user as IUser
    const role = user.role

    logger.info('Google OAuth callback success', {
      userId: user._id,
      role: role || 'no-role',
      status: user.status,
    })

    // Check if user has no role (new user needs to select role)
    if (!user.role) {
      // Redirect to login page with content parameter for role selection
      const redirectUrl = new URL(config.FRONTEND_URL || 'http://localhost:3000')
      redirectUrl.pathname = '/auth/login'
      redirectUrl.searchParams.append('content', user._id.toString())

      logger.info('Redirecting to role selection', { userId: user._id })
      return res.redirect(redirectUrl.toString())
    }

    // Check if additional information is needed for existing roles
    const needsAdditionalInfo =
      (role === UserRole.SELLER &&
        (!(user.profile as any)?.businessName || !(user.profile as any)?.einNumber)) ||
      (role === UserRole.DRIVER && !(user.profile as any)?.driverLicense?.number)

    // Generate tokens
    const tokens = {
      accessToken: user.generateAccessToken(),
      refreshToken: user.generateRefreshToken(),
      expiresIn: 900,
    }

    // Add refresh token to user
    await user.addRefreshToken(tokens.refreshToken)

    // Set authentication cookies
    setAuthCookies(res, tokens)

    // Redirect to frontend with appropriate route
    const redirectUrl = new URL(config.FRONTEND_URL || 'http://localhost:3000')

    if (needsAdditionalInfo) {
      // Redirect to complete profile page
      redirectUrl.pathname = '/auth/complete-profile'
      redirectUrl.searchParams.append('role', role)
    } else {
      // Normal callback
      redirectUrl.pathname = '/auth/callback'
    }

    redirectUrl.searchParams.append('accessToken', tokens.accessToken)
    redirectUrl.searchParams.append('refreshToken', tokens.refreshToken)
    redirectUrl.searchParams.append('needsAdditionalInfo', needsAdditionalInfo.toString())

    res.redirect(redirectUrl.toString())
  }),
]

/**
 * Google OAuth failure handler
 */
export const googleFailure = catchAsync(async (req: Request, res: Response) => {
  logger.error('Google OAuth authentication failed')

  const redirectUrl = new URL(config.FRONTEND_URL || 'http://localhost:3000')
  redirectUrl.pathname = '/auth/error'
  redirectUrl.searchParams.append('error', 'google_auth_failed')
  redirectUrl.searchParams.append('message', 'Failed to authenticate with Google')

  res.redirect(redirectUrl.toString())
})

/**
 * Get current user profile
 */
export const getCurrentUser = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as IUser

  if (!user) {
    throw ApiError.unauthorized('User not authenticated')
  }

  // Format user response using helper function
  const userResponse = formatUserResponse(user)
  console.log('userResponse', userResponse)
  return ApiResponse.success(
    res,
    {
      user: userResponse,
    },
    'User profile fetched successfully'
  )
})

/**
 * Health check endpoint
 */
export const healthCheck = catchAsync(async (req: Request, res: Response) => {
  return ApiResponse.success(
    res,
    {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'auth-service',
    },
    'Service is healthy'
  )
})

/**
 * Change password for authenticated user
 */
export const changePassword = catchAsync(async (req: Request, res: Response) => {
  const userId = req.userId!
  const { oldPassword, newPassword } = req.body

  // Validate input
  if (!oldPassword || !newPassword) {
    throw ApiError.badRequest('Old password and new password are required')
  }

  // Password strength validation
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}$/
  if (!passwordRegex.test(newPassword)) {
    throw ApiError.badRequest(
      'Password must contain at least 8 characters, one uppercase letter, one lowercase letter, one number, and one special character'
    )
  }

  // Check if old and new passwords are the same
  if (oldPassword === newPassword) {
    throw ApiError.badRequest('New password must be different from current password')
  }

  await authService.changePassword(userId, oldPassword, newPassword)

  logger.info('Password changed successfully', { userId })

  return ApiResponse.success(res, null, 'Password changed successfully')
})

export default {
  register,
  login,
  refreshToken,
  logout,
  logoutFromAllDevices,
  requestPasswordReset,
  verifyResetToken,
  resetPassword,
  googleLogin,
  googleCallback,
  googleFailure,
  getCurrentUser,
  healthCheck,
  changePassword,
}
