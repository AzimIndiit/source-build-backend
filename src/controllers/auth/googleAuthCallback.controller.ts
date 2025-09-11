import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { IUser } from '@/models/user/user.types.js';
import UserCartModel from '@/models/cart/cart.model.js';
import RefreshTokenModel from '@/models/refreshToken/refreshToken.model.js';
import config from '@config/index.js';
import logger from '@config/logger.js';
import StripeService from '@/services/stripe.service.js';

// Helper to parse duration string (e.g., '7d' -> milliseconds)
const parseDuration = (duration: string): number => {
  const matches = duration.match(/(\d+)([dhms])/);
  if (!matches) return 0;
  
  const [, value, unit] = matches;
  const multipliers: { [key: string]: number } = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  
  return parseInt(value) * (multipliers[unit] || 0);
};

export const googleCallback = (req: Request, res: Response, next: NextFunction) => {
  passport.authenticate('google', { session: false }, async (err: any, user: IUser) => {
    if (err || !user) {
      logger.error('Google authentication failed', { err, user });
      return res.redirect(
        `${process.env.FRONTEND_URL}/auth/login?error=authentication_failed`
      );
    }

    // If user has no role, redirect to login page with content parameter for role selection
    if (!user.role) {
      logger.info('User needs role selection', { userId: user._id });
      return res.redirect(
        `${process.env.FRONTEND_URL}/auth/login?content=${user._id}`
      );
    }

    // Create cart for buyers if not exists
    if (user.role === 'buyer') {
      const existingCart = await UserCartModel.findOne({ user_id: user._id });
      if (!existingCart) {
        await UserCartModel.create({
          user_id: user._id,
          items: [],
        });
      }
    }

    // Create Stripe customer if doesn't exist
    let stripeCustomerId = user.stripeCustomerId
    console.log('stripeCustomerId---1', stripeCustomerId)
    if (!stripeCustomerId) {
      const customer = await StripeService.createCustomer({
        email: user.email,
        name: user.displayName,
      })
      stripeCustomerId = customer.id
      user.stripeCustomerId = stripeCustomerId
      await user.save()
    }

    // Generate tokens
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    // Store refresh token in database
    await RefreshTokenModel.create({
      user: user._id,
      token: accessToken,
      refresh_token: refreshToken,
      expires_at: new Date(
        Date.now() + parseDuration(config.JWT_REFRESH_EXPIRES_IN)
      ),
      createdByIp: req.ip,
    });

    // Clear role from session if it exists
    if (req.session) {
      delete (req.session as any).role;
    }

    // Redirect to frontend with tokens
    res.redirect(
      `${process.env.FRONTEND_URL}/auth/callback?accessToken=${accessToken}&refreshToken=${refreshToken}`
    );
  })(req, res, next);
};

export default googleCallback;