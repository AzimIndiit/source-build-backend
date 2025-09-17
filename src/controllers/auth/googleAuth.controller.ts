import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import config from '@config/index.js';
import { UserCartModel } from '@/models/user/user.model.js';
import { refresh_tokenModel } from '@/models/user/user.model.js';
import { parseDuration } from '@/utils/helpers/dateHelpers.js';

const generateaccess_token = (payload: any) => {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.accessExpiresIn,
  });
};

const generaterefresh_token = (userId: string) => {
  const refresh_token = jwt.sign({ userId }, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
  });
  return { token: refresh_token };
};

export const googleAuth = (req: Request, res: Response, next: NextFunction) => {
  passport.authenticate('google', {
    scope: ['profile', 'email'],
  })(req, res, next);
};

export const googleCallback = (req: Request, res: Response, next: NextFunction) => {
  passport.authenticate('google', { session: false }, async (err: any, user: any) => {
    if (err || !user) {
      console.log('err', err, user);
      return res.redirect(
        `${process.env.FRONTEND_URL}/login?error=authentication_failed`
      );
    }

    if (!user.role) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/login?content=${user._id}`
      );
    }

    const payload = {
      userId: user._id,
      role: user.role,
      first_name: user.first_name,
      last_name: user.last_name,
      profile_picture: user.profile_picture,
      google_profile_picture: user.google_profile_picture || '',
    };

    if (payload.role === 'buyer') {
      const isCart = await UserCartModel.findOne({ user: user._id });
      if (!isCart) {
        await UserCartModel.create({
          user: user._id,
          items: [],
        });
      }
    }

    const newaccess_token = generateaccess_token(payload);
    const { token: newrefresh_token } = generaterefresh_token(user._id.toString());

    await refresh_tokenModel.create({
      user: user._id,
      token: newaccess_token,
      refresh_token: newrefresh_token,
      expires_at: new Date(
        Date.now() + parseDuration(config.jwt.refreshExpiresIn)
      ),
      createdByIp: req.ip,
    });

    if (req.session) {
      delete (req.session as any).role;
    }

    // Redirect to frontend with token
    res.redirect(
      `${process.env.FRONTEND_URL}/auth-redirect?token=${newaccess_token}&refresh_token=${newrefresh_token}`
    );
  })(req, res, next);
};

export default {
  googleAuth,
  googleCallback,
};