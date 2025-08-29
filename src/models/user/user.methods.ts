import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import config from '@config/index.js';
import type { IUser } from './user.types.js';

/**
 * User instance methods
 */

/**
 * Compare password with hashed password
 */
export async function comparePassword(this: IUser, candidatePassword: string): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
}

/**
 * Generate JWT access token
 */
export function generateAccessToken(this: IUser): string {
  return jwt.sign(
    {
      id: (this._id as any).toString(),
      email: this.email,
      username: this.username,
      role: this.role,
    },
    config.JWT_SECRET,
    {
      expiresIn: config.JWT_EXPIRES_IN,
      issuer: config.APP.NAME,
      subject: (this._id as any).toString(),
    } as jwt.SignOptions
  );
}

/**
 * Generate JWT refresh token
 */
export function generateRefreshToken(this: IUser): string {
  return jwt.sign(
    {
      id: (this._id as any).toString(),
      type: 'refresh',
    },
    config.JWT_REFRESH_SECRET,
    {
      expiresIn: config.JWT_REFRESH_EXPIRES_IN,
      issuer: config.APP.NAME,
      subject: (this._id as any).toString(),
    } as jwt.SignOptions
  );
}

/**
 * Generate password reset token
 */
export function generatePasswordResetToken(this: IUser): string {
  return jwt.sign(
    {
      id: (this._id as any).toString(),
      email: this.email,
      type: 'password_reset',
    },
    config.JWT_SECRET,
    {
      expiresIn: '1h',
      issuer: config.APP.NAME,
      subject: (this._id as any).toString(),
    } as jwt.SignOptions
  );
}

/**
 * Generate email verification token
 */
export function generateEmailVerificationToken(this: IUser): string {
  return jwt.sign(
    {
      id: (this._id as any).toString(),
      email: this.email,
      type: 'email_verification',
    },
    config.JWT_SECRET,
    {
      expiresIn: '24h',
      issuer: config.APP.NAME,
      subject: (this._id as any).toString(),
    } as jwt.SignOptions
  );
}

/**
 * Add refresh token to user's token list
 */
export async function addRefreshToken(this: IUser, token: string): Promise<void> {
  this.refreshTokens.push(token);
  await this.save();
}

/**
 * Remove specific refresh token from user's token list
 */
export async function removeRefreshToken(this: IUser, token: string): Promise<void> {
  this.refreshTokens = this.refreshTokens.filter((rt: string) => rt !== token);
  await this.save();
}

/**
 * Clear all refresh tokens for the user
 */
export async function clearRefreshTokens(this: IUser): Promise<void> {
  this.refreshTokens = [];
  await this.save();
}

/**
 * Check if user account is currently locked
 */
export function isAccountLocked(this: IUser): boolean {
  return !!(this.auth?.lockUntil && this.auth.lockUntil > new Date());
}

/**
 * Increment failed login attempts and lock account if necessary
 */
export async function incrementLoginAttempts(this: IUser): Promise<void> {
  if (!this.auth) {
    this.auth = {} as any;
  }
  
  this.auth.loginAttempts = (this.auth.loginAttempts || 0) + 1;
  
  // Lock account after 5 failed attempts for 30 minutes
  if (this.auth.loginAttempts >= 5) {
    this.auth.lockUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
  }
  
  await this.save();
}

/**
 * Reset login attempts and update last login time
 */
export async function resetLoginAttempts(this: IUser): Promise<void> {
  if (!this.auth) {
    this.auth = {} as any;
  }
  
  this.auth.loginAttempts = 0;
  if (this.auth.lockUntil !== undefined) {
    delete this.auth.lockUntil;
  }
  this.auth.lastLoginAt = new Date();
  
  await this.save();
}

/**
 * Custom toJSON method to remove sensitive fields
 */
export function toJSON(this: IUser): any {
  const userObject = this.toObject();
  
  // Remove sensitive fields
  delete userObject.password;
  delete userObject.refreshTokens;
  if (userObject.auth?.twoFactorSecret) {
    delete userObject.auth.twoFactorSecret;
  }
  delete userObject.__v;
  
  return userObject;
}

/**
 * Bind all methods to the schema
 */
export function bindMethods(schema: any): void {
  schema.methods.comparePassword = comparePassword;
  schema.methods.generateAccessToken = generateAccessToken;
  schema.methods.generateRefreshToken = generateRefreshToken;
  schema.methods.generatePasswordResetToken = generatePasswordResetToken;
  schema.methods.generateEmailVerificationToken = generateEmailVerificationToken;
  schema.methods.addRefreshToken = addRefreshToken;
  schema.methods.removeRefreshToken = removeRefreshToken;
  schema.methods.clearRefreshTokens = clearRefreshTokens;
  schema.methods.isAccountLocked = isAccountLocked;
  schema.methods.incrementLoginAttempts = incrementLoginAttempts;
  schema.methods.resetLoginAttempts = resetLoginAttempts;
  schema.methods.toJSON = toJSON;
}