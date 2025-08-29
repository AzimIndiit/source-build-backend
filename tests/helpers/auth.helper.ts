import jwt from 'jsonwebtoken';
import { UserRole } from '../../src/types/models/user.types';

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export class AuthTestHelper {
  /**
   * Generate a valid JWT access token for testing
   */
  static generateAccessToken(payload: TokenPayload): string {
    return jwt.sign(payload, process.env.JWT_SECRET || 'test-jwt-secret', {
      expiresIn: '15m'
    });
  }

  /**
   * Generate a valid JWT refresh token for testing
   */
  static generateRefreshToken(payload: TokenPayload): string {
    return jwt.sign(payload, process.env.JWT_REFRESH_SECRET || 'test-jwt-refresh-secret', {
      expiresIn: '7d'
    });
  }

  /**
   * Generate an expired JWT token for testing
   */
  static generateExpiredToken(payload: TokenPayload): string {
    return jwt.sign(payload, process.env.JWT_SECRET || 'test-jwt-secret', {
      expiresIn: '-1h'
    });
  }

  /**
   * Generate auth headers with bearer token
   */
  static getAuthHeaders(token: string): { Authorization: string } {
    return {
      Authorization: `Bearer ${token}`
    };
  }

  /**
   * Create a complete auth response object
   */
  static createAuthResponse(user: any) {
    const payload: TokenPayload = {
      userId: user._id,
      email: user.email,
      role: user.role
    };

    return {
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      accessToken: this.generateAccessToken(payload),
      refreshToken: this.generateRefreshToken(payload)
    };
  }

  /**
   * Generate password reset token
   */
  static generatePasswordResetToken(): string {
    return jwt.sign(
      { type: 'password-reset', timestamp: Date.now() },
      process.env.JWT_SECRET || 'test-jwt-secret',
      { expiresIn: '1h' }
    );
  }

  /**
   * Generate email verification token
   */
  static generateEmailVerificationToken(): string {
    return jwt.sign(
      { type: 'email-verification', timestamp: Date.now() },
      process.env.JWT_SECRET || 'test-jwt-secret',
      { expiresIn: '24h' }
    );
  }

  /**
   * Mock OAuth profile data
   */
  static mockOAuthProfile(provider: 'google' | 'facebook' | 'apple') {
    const profiles = {
      google: {
        id: 'google_123456',
        emails: [{ value: 'user@gmail.com', verified: true }],
        displayName: 'Google User',
        name: {
          givenName: 'Google',
          familyName: 'User'
        },
        photos: [{ value: 'https://example.com/photo.jpg' }],
        provider: 'google'
      },
      facebook: {
        id: 'facebook_123456',
        emails: [{ value: 'user@facebook.com' }],
        displayName: 'Facebook User',
        name: {
          givenName: 'Facebook',
          familyName: 'User'
        },
        photos: [{ value: 'https://example.com/photo.jpg' }],
        provider: 'facebook'
      },
      apple: {
        id: 'apple_123456',
        emails: [{ value: 'user@icloud.com' }],
        displayName: 'Apple User',
        name: {
          givenName: 'Apple',
          familyName: 'User'
        },
        provider: 'apple'
      }
    };

    return profiles[provider];
  }
}