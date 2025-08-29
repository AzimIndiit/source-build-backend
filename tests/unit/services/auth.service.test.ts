import { jest } from '@jest/globals';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuthService } from '../../../src/services/auth.service';
import { User } from '../../../src/models/user.model';
import { ApiError } from '../../../src/utils/ApiError';
import { UserRole } from '../../../src/types/models/user.types';

// Mock dependencies
jest.mock('../../../src/models/user.model');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
    jest.clearAllMocks();
  });

  describe('register', () => {
    const mockUserData = {
      email: 'test@example.com',
      password: 'Test123!',
      name: 'Test User',
      role: UserRole.BUYER
    };

    it('should successfully register a new user', async () => {
      const hashedPassword = 'hashed_password';
      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        ...mockUserData,
        password: hashedPassword,
        save: jest.fn()
      };

      (User.findOne as jest.Mock).mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      (User.create as jest.Mock).mockResolvedValue(mockUser);

      const result = await authService.register(mockUserData);

      expect(User.findOne).toHaveBeenCalledWith({ email: mockUserData.email });
      expect(bcrypt.hash).toHaveBeenCalledWith(mockUserData.password, 10);
      expect(User.create).toHaveBeenCalledWith({
        ...mockUserData,
        password: hashedPassword
      });
      expect(result).toEqual(mockUser);
    });

    it('should throw error if user already exists', async () => {
      (User.findOne as jest.Mock).mockResolvedValue({ email: mockUserData.email });

      await expect(authService.register(mockUserData)).rejects.toThrow(
        new ApiError(400, 'User already exists with this email')
      );

      expect(User.create).not.toHaveBeenCalled();
    });

    it('should throw error for invalid email format', async () => {
      const invalidData = { ...mockUserData, email: 'invalid-email' };

      await expect(authService.register(invalidData)).rejects.toThrow(
        new ApiError(400, 'Invalid email format')
      );

      expect(User.findOne).not.toHaveBeenCalled();
      expect(User.create).not.toHaveBeenCalled();
    });

    it('should throw error for weak password', async () => {
      const weakPasswordData = { ...mockUserData, password: '123' };

      await expect(authService.register(weakPasswordData)).rejects.toThrow(
        new ApiError(400, 'Password must be at least 8 characters long')
      );

      expect(User.findOne).not.toHaveBeenCalled();
      expect(User.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const loginData = {
      email: 'test@example.com',
      password: 'Test123!'
    };

    const mockUser = {
      _id: '507f1f77bcf86cd799439011',
      email: loginData.email,
      password: 'hashed_password',
      name: 'Test User',
      role: UserRole.BUYER,
      isActive: true,
      isVerified: true
    };

    it('should successfully login with valid credentials', async () => {
      const mockAccessToken = 'access_token';
      const mockRefreshToken = 'refresh_token';

      (User.findOne as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwt.sign as jest.Mock)
        .mockReturnValueOnce(mockAccessToken)
        .mockReturnValueOnce(mockRefreshToken);

      const result = await authService.login(loginData);

      expect(User.findOne).toHaveBeenCalledWith({ email: loginData.email });
      expect(bcrypt.compare).toHaveBeenCalledWith(loginData.password, mockUser.password);
      expect(jwt.sign).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        user: mockUser,
        accessToken: mockAccessToken,
        refreshToken: mockRefreshToken
      });
    });

    it('should throw error for non-existent user', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(null);

      await expect(authService.login(loginData)).rejects.toThrow(
        new ApiError(401, 'Invalid email or password')
      );

      expect(bcrypt.compare).not.toHaveBeenCalled();
      expect(jwt.sign).not.toHaveBeenCalled();
    });

    it('should throw error for incorrect password', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(authService.login(loginData)).rejects.toThrow(
        new ApiError(401, 'Invalid email or password')
      );

      expect(jwt.sign).not.toHaveBeenCalled();
    });

    it('should throw error for inactive user account', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      (User.findOne as jest.Mock).mockResolvedValue(inactiveUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(authService.login(loginData)).rejects.toThrow(
        new ApiError(403, 'Account is deactivated. Please contact support.')
      );

      expect(jwt.sign).not.toHaveBeenCalled();
    });

    it('should throw error for unverified user account', async () => {
      const unverifiedUser = { ...mockUser, isVerified: false };
      (User.findOne as jest.Mock).mockResolvedValue(unverifiedUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(authService.login(loginData)).rejects.toThrow(
        new ApiError(403, 'Please verify your email before logging in')
      );

      expect(jwt.sign).not.toHaveBeenCalled();
    });
  });

  describe('refreshToken', () => {
    const mockRefreshToken = 'valid_refresh_token';
    const mockPayload = {
      userId: '507f1f77bcf86cd799439011',
      email: 'test@example.com',
      role: UserRole.BUYER
    };

    it('should successfully refresh access token', async () => {
      const mockNewAccessToken = 'new_access_token';
      const mockNewRefreshToken = 'new_refresh_token';
      const mockUser = {
        _id: mockPayload.userId,
        email: mockPayload.email,
        role: mockPayload.role,
        isActive: true
      };

      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);
      (User.findById as jest.Mock).mockResolvedValue(mockUser);
      (jwt.sign as jest.Mock)
        .mockReturnValueOnce(mockNewAccessToken)
        .mockReturnValueOnce(mockNewRefreshToken);

      const result = await authService.refreshToken(mockRefreshToken);

      expect(jwt.verify).toHaveBeenCalledWith(
        mockRefreshToken,
        process.env.JWT_REFRESH_SECRET
      );
      expect(User.findById).toHaveBeenCalledWith(mockPayload.userId);
      expect(result).toEqual({
        accessToken: mockNewAccessToken,
        refreshToken: mockNewRefreshToken
      });
    });

    it('should throw error for invalid refresh token', async () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(authService.refreshToken(mockRefreshToken)).rejects.toThrow(
        new ApiError(401, 'Invalid refresh token')
      );

      expect(User.findById).not.toHaveBeenCalled();
    });

    it('should throw error if user not found', async () => {
      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);
      (User.findById as jest.Mock).mockResolvedValue(null);

      await expect(authService.refreshToken(mockRefreshToken)).rejects.toThrow(
        new ApiError(401, 'User not found')
      );

      expect(jwt.sign).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('should successfully logout user', async () => {
      const userId = '507f1f77bcf86cd799439011';
      const refreshToken = 'refresh_token';

      // Mock Redis operations for token blacklisting
      const result = await authService.logout(userId, refreshToken);

      expect(result).toEqual({ message: 'Logged out successfully' });
    });
  });

  describe('changePassword', () => {
    const userId = '507f1f77bcf86cd799439011';
    const passwordData = {
      currentPassword: 'OldPass123!',
      newPassword: 'NewPass123!'
    };

    it('should successfully change password', async () => {
      const mockUser = {
        _id: userId,
        password: 'old_hashed_password',
        save: jest.fn()
      };

      (User.findById as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new_hashed_password');

      const result = await authService.changePassword(userId, passwordData);

      expect(User.findById).toHaveBeenCalledWith(userId);
      expect(bcrypt.compare).toHaveBeenCalledWith(
        passwordData.currentPassword,
        mockUser.password
      );
      expect(bcrypt.hash).toHaveBeenCalledWith(passwordData.newPassword, 10);
      expect(mockUser.save).toHaveBeenCalled();
      expect(result).toEqual({ message: 'Password changed successfully' });
    });

    it('should throw error for incorrect current password', async () => {
      const mockUser = {
        _id: userId,
        password: 'old_hashed_password'
      };

      (User.findById as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        authService.changePassword(userId, passwordData)
      ).rejects.toThrow(new ApiError(401, 'Current password is incorrect'));

      expect(bcrypt.hash).not.toHaveBeenCalled();
    });

    it('should throw error if new password is same as current', async () => {
      const samePasswordData = {
        currentPassword: 'SamePass123!',
        newPassword: 'SamePass123!'
      };

      await expect(
        authService.changePassword(userId, samePasswordData)
      ).rejects.toThrow(
        new ApiError(400, 'New password cannot be the same as current password')
      );

      expect(User.findById).not.toHaveBeenCalled();
    });
  });

  describe('forgotPassword', () => {
    const email = 'test@example.com';

    it('should send password reset email successfully', async () => {
      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        email,
        name: 'Test User',
        generatePasswordResetToken: jest.fn().mockReturnValue('reset_token'),
        save: jest.fn()
      };

      (User.findOne as jest.Mock).mockResolvedValue(mockUser);
      // Mock email service call

      const result = await authService.forgotPassword(email);

      expect(User.findOne).toHaveBeenCalledWith({ email });
      expect(mockUser.generatePasswordResetToken).toHaveBeenCalled();
      expect(mockUser.save).toHaveBeenCalled();
      expect(result).toEqual({
        message: 'Password reset link sent to your email'
      });
    });

    it('should return success even if user not found (security)', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(null);

      const result = await authService.forgotPassword(email);

      expect(result).toEqual({
        message: 'Password reset link sent to your email'
      });
    });
  });

  describe('resetPassword', () => {
    const resetToken = 'valid_reset_token';
    const newPassword = 'NewPass123!';

    it('should successfully reset password', async () => {
      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        password: 'old_password',
        passwordResetToken: resetToken,
        passwordResetExpires: new Date(Date.now() + 3600000), // 1 hour from now
        save: jest.fn()
      };

      (User.findOne as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new_hashed_password');

      const result = await authService.resetPassword(resetToken, newPassword);

      expect(User.findOne).toHaveBeenCalledWith({
        passwordResetToken: resetToken,
        passwordResetExpires: { $gt: expect.any(Date) }
      });
      expect(bcrypt.hash).toHaveBeenCalledWith(newPassword, 10);
      expect(mockUser.save).toHaveBeenCalled();
      expect(result).toEqual({ message: 'Password reset successfully' });
    });

    it('should throw error for invalid or expired token', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        authService.resetPassword(resetToken, newPassword)
      ).rejects.toThrow(new ApiError(400, 'Invalid or expired reset token'));

      expect(bcrypt.hash).not.toHaveBeenCalled();
    });
  });

  describe('verifyEmail', () => {
    const verificationToken = 'valid_verification_token';

    it('should successfully verify email', async () => {
      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
        isVerified: false,
        emailVerificationToken: verificationToken,
        save: jest.fn()
      };

      (User.findOne as jest.Mock).mockResolvedValue(mockUser);

      const result = await authService.verifyEmail(verificationToken);

      expect(User.findOne).toHaveBeenCalledWith({
        emailVerificationToken: verificationToken,
        isVerified: false
      });
      expect(mockUser.isVerified).toBe(true);
      expect(mockUser.emailVerificationToken).toBeUndefined();
      expect(mockUser.save).toHaveBeenCalled();
      expect(result).toEqual({ message: 'Email verified successfully' });
    });

    it('should throw error for invalid token', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(null);

      await expect(authService.verifyEmail(verificationToken)).rejects.toThrow(
        new ApiError(400, 'Invalid verification token')
      );
    });
  });
});