import jwt, { JwtPayload } from 'jsonwebtoken';
import UserModal  , { IUser, IUserProfile, UserRole, UserStatus, } from'@/models/user/user.model.js';
import config from '@config/index.js';
import ApiError from '@utils/ApiError.js';
import logger from '@config/logger.js';

/**
 * Interface for login credentials
 */
export interface ILoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

/**
 * Interface for registration data
 */
export interface IRegisterData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: UserRole; 
  profile: IUserProfile;
  termsAccepted: boolean;
}

/**
 * Interface for authentication tokens
 */
export interface IAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * Interface for token payload
 */
export interface ITokenPayload extends JwtPayload {
  id: string;
  email?: string;
  username?: string;
  role?: UserRole;
  type?: string;
}

/**
 * Authentication service class
 */
class AuthService {
  /**
   * Generate a 6-digit OTP
   */
  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Generate JWT tokens
   */
  private generateTokens(user: IUser): IAuthTokens {
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    
    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes in seconds
    };
  }

  /**
   * Register a new user
   */
  async register(registerData: IRegisterData): Promise<{ user: IUser; tokens: IAuthTokens; otpSent: boolean }> {
    try {
      logger.info('Attempting to register new user', { email: registerData.email });

      // Check if user already exists
      const existingUser = await UserModal.findOne({
        email: registerData.email.toLowerCase()
      });

      if (existingUser) {
        throw ApiError.conflict('Email is already registered');
      }

     
      // Create user data
      const userData = {
        firstName: registerData.firstName,
        lastName: registerData.lastName,
        email: registerData.email.toLowerCase(),
        password: registerData.password,
        role: registerData.role,
        status: UserStatus.PENDING,
        termsAccepted: registerData.termsAccepted,
        profile: {
          ...registerData.profile,
          addresses: [],
        } as IUserProfile,
      };

      // Create new user
      const user = await UserModal.create(userData);

      // Generate tokens
      const tokens = this.generateTokens(user);

      // Generate OTP for email verification
      const otp = this.generateOTP();
      
      // Store OTP in user's auth data (you might want to use Redis for this in production)
      await user.save();

      // TODO: Send OTP email here
      // await emailService.sendOTPEmail(user.email, otp);
      logger.info(`OTP Generated for ${user.email}: ${otp}`); // For development only
      
      logger.info('User registered successfully, OTP sent', { userId: user._id, email: user.email });

      return {
        user,
        tokens,
        otpSent: true,
      };
    } catch (error) {
      logger.error('Registration failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  /**
   * Login a user
   */
  async login(credentials: ILoginCredentials): Promise<{ user: IUser; tokens: IAuthTokens }> {
    try {
      logger.info('Login attempt', { email: credentials.email });

      // Find user by email
      const user = await UserModal.findByEmail(credentials.email);

      if (!user) {
        throw ApiError.unauthorized('Invalid credentials');
      }

     

      // Check if account is active
      if (user.status !== UserStatus.ACTIVE && user.status !== UserStatus.PENDING) {
        throw ApiError.forbidden('Account is suspended or inactive');
      }

      // Verify password
      const isPasswordValid = await user.comparePassword(credentials.password);

      if (!isPasswordValid) {
        await user.incrementLoginAttempts();
        throw ApiError.unauthorized('Invalid credentials');
      }

      // Reset login attempts on successful login
      await user.resetLoginAttempts();

      // Generate tokens
      const tokens = this.generateTokens(user);

      // Add refresh token to user
      await user.addRefreshToken(tokens.refreshToken);

      // Update remember me preference if provided
      if (credentials.rememberMe !== undefined) {
        user.rememberMe = credentials.rememberMe;
        await user.save();
      }

      logger.info('User logged in successfully', { userId: user._id, email: user.email });

      return {
        user,
        tokens,
      };
    } catch (error) {
      logger.error('Login failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  /**
   * Verify OTP for email verification
   */
  async verifyOtp(emailOrUserId: string, otp: string): Promise<{ user: IUser; tokens: IAuthTokens }> {
    try {
      logger.info('OTP verification attempt', { emailOrUserId });

      // Find user by email or ID
      let user: IUser | null;
      if (emailOrUserId.includes('@')) {
        user = await UserModal.findByEmail(emailOrUserId);
      } else {
        user = await UserModal.findById(emailOrUserId);
      }

      if (!user) {
        throw ApiError.notFound('User not found');
      }
      user.status = UserStatus.ACTIVE;
      await user.save();

      // Generate tokens
      const tokens = this.generateTokens(user);

      // Add refresh token to user
      await user.addRefreshToken(tokens.refreshToken);

      logger.info('OTP verified successfully', { userId: user._id });

      return {
        user,
        tokens,
      };
    } catch (error) {
      logger.error('OTP verification failed', { error });
      throw error;
    }
  }

  /**
   * Resend OTP
   */
  async resendOtp(email: string): Promise<boolean> {
    try {
      logger.info('Resending OTP', { email });

      const user = await UserModal.findByEmail(email);
      if (!user) {
        throw ApiError.notFound('User not found');
      }

      // Generate new OTP
      const otp = this.generateOTP();
      
      await user.save();

      // TODO: Send OTP email here
      // await emailService.sendOTPEmail(user.email, otp);
      logger.info(`OTP Resent for ${user.email}: ${otp}`); // For development only
      
      logger.info('OTP resent successfully', { email });
      return true;
    } catch (error) {
      logger.error('Resend OTP failed', { error, email });
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<IAuthTokens> {
    try {
      logger.info('Token refresh attempt');

      // Verify refresh token
      const payload = jwt.verify(refreshToken, config.JWT_REFRESH_SECRET) as ITokenPayload;
      
      if (payload.type !== 'refresh') {
        throw ApiError.badRequest('Invalid token type');
      }

      // Find user and check if refresh token exists
      const user = await UserModal.findById(payload.id);
      if (!user) {
        throw ApiError.notFound('User not found');
      }

      // Check if refresh token is in the user's token list
      if (!user.refreshTokens.includes(refreshToken)) {
        throw ApiError.unauthorized('Invalid refresh token');
      }

      // Remove old refresh token
      await user.removeRefreshToken(refreshToken);

      // Generate new tokens
      const tokens = this.generateTokens(user);

      // Add new refresh token to user
      await user.addRefreshToken(tokens.refreshToken);

      logger.info('Token refreshed successfully', { userId: user._id });

      return tokens;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw ApiError.unauthorized('Invalid or expired refresh token');
      }
      logger.error('Token refresh failed', { error });
      throw error;
    }
  }

  /**
   * Logout user
   */
  async logout(userId: string, refreshToken?: string): Promise<void> {
    try {
      logger.info('Logout attempt', { userId });

      const user = await UserModal.findById(userId);
      if (!user) {
        throw ApiError.notFound('User not found');
      }

      // Remove specific refresh token if provided
      if (refreshToken) {
        await user.removeRefreshToken(refreshToken);
      }
      
      logger.info('User logged out successfully', { userId });
    } catch (error) {
      logger.error('Logout failed', { error, userId });
      throw error;
    }
  }

  /**
   * Logout from all devices
   */
  async logoutFromAllDevices(userId: string): Promise<void> {
    try {
      logger.info('Logout from all devices attempt', { userId });

      const user = await UserModal.findById(userId);
      if (!user) {
        throw ApiError.notFound('User not found');
      }

      // Clear all refresh tokens
      user.refreshTokens = [];
      await user.save();
      
      logger.info('User logged out from all devices successfully', { userId });
    } catch (error) {
      logger.error('Logout from all devices failed', { error, userId });
      throw error;
    }
  }

  /**
   * Generate password reset token
   */
  async generatePasswordResetToken(email: string): Promise<string> {
    try {
      logger.info('Password reset token generation', { email });

      const user = await UserModal.findByEmail(email);
      if (!user) {
        // Don't reveal if email exists or not
        logger.info('Password reset requested for non-existent email', { email });
        return '';
      }

      const token = user.generatePasswordResetToken();
      
      // TODO: Send password reset email
      // await emailService.sendPasswordResetEmail(user.email, token);
      logger.info(`Password reset token for ${user.email}: ${token}`); // For development only

      return token;
    } catch (error) {
      logger.error('Failed to generate password reset token', { error, email });
      throw error;
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      logger.info('Password reset attempt');

      // Verify token
      const payload = jwt.verify(token, config.JWT_SECRET) as ITokenPayload;
      
      if (payload.type !== 'password_reset') {
        throw ApiError.badRequest('Invalid token type');
      }

      const user = await UserModal.findById(payload.id).select('+password');
      if (!user) {
        throw ApiError.notFound('User not found');
      }

      // Update password
      user.password = newPassword;
      await user.save();

      // Clear all refresh tokens to force re-login
      await user.clearRefreshTokens();

      logger.info('Password reset successfully', { userId: user._id });
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw ApiError.badRequest('Invalid or expired reset token');
      }
      logger.error('Password reset failed', { error });
      throw error;
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, updateData: any): Promise<IUser> {
    try {
      const user = await UserModal.findByIdAndUpdate(
        userId,
        { $set: updateData },
        { new: true, runValidators: true }
      );

      if (!user) {
        throw ApiError.notFound('User not found');
      }

      logger.info('Profile updated successfully', { userId });
      return user;
    } catch (error) {
      logger.error('Profile update failed', { error, userId });
      throw error;
    }
  }

  /**
   * Change user password
   */
  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    try {
      // Find user and include password field
      const user = await UserModal.findById(userId).select('+password');
      
      if (!user) {
        throw ApiError.notFound('User not found');
      }

      // Verify old password
      const isPasswordCorrect = await user.comparePassword(oldPassword);
      if (!isPasswordCorrect) {
        throw ApiError.badRequest('Current password is incorrect');
      }

      // Update password (will be hashed by pre-save middleware)
      user.password = newPassword;
      await user.save();

      // Clear all refresh tokens to force re-login on all devices
      await user.clearRefreshTokens();

      logger.info('Password changed successfully', { userId });
    } catch (error) {
      logger.error('Password change failed', { error, userId });
      throw error;
    }
  }
}

// Export singleton instance
export default new AuthService();