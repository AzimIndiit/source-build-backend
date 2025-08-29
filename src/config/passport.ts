import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import UserModal from '../models/user/user.model.js';
import { IUser, UserRole, UserStatus, AuthType } from '../models/user/user.types.js';
import config from './index.js';
import logger from './logger.js';

// TypeScript types for passport
declare global {
  namespace Express {
    interface User extends IUser {}
  }
}

// Serialize user for session
passport.serializeUser((user: any, done) => {
  done(null, user._id);
});

// Deserialize user from session
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await UserModal.findById(id);
    done(null, user);
  } catch (error) {
    logger.error('Failed to deserialize user', { error, userId: id });
    done(error, null);
  }
});

// Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: config.GOOGLE_OAUTH.CLIENT_ID || '',
      clientSecret: config.GOOGLE_OAUTH.CLIENT_SECRET || '',
      callbackURL: config.GOOGLE_OAUTH.CALLBACK_URL || '/api/v1/auth/google/callback',
      passReqToCallback: true,
    },
    async (req: any, _accessToken: string, _refreshToken: string, profile: any, done: any) => {
      try {
        logger.info('Google OAuth callback', { googleId: profile.id, email: profile.emails?.[0]?.value });

        // Extract email from profile
        const email = profile.emails?.[0]?.value;
        if (!email) {
          return done(new Error('No email found in Google profile'), null);
        }

        // Check if user already exists with this Google ID
        let user = await UserModal.findOne({
          $or: [
            { 'profile.socialAccounts.providerId': profile.id },
            { email: email.toLowerCase() }
          ]
        });

        if (!user) {
          // Get role from session or default to buyer
          const role = (req.session?.role as UserRole) || UserRole.BUYER;
          
          // Validate role
          if (!Object.values(UserRole).includes(role) || role === UserRole.ADMIN) {
            logger.warn('Invalid role attempted via Google OAuth', { role });
            return done(new Error('Invalid registration role'), null);
          }

          // Base user data
          const userData: any = {
            email: email.toLowerCase(),
            googleId: profile.id,
            authType: AuthType.GOOGLE,
            firstName: profile.name?.givenName || '',
            lastName: profile.name?.familyName || '',
            displayName: profile.displayName || profile.name?.givenName || email.split('@')[0],
            avatar: profile.photos?.[0]?.value,
            isEmailVerified: true, // Google accounts are pre-verified
            role: role,
            termsAccepted: true, // Will need to be confirmed in UI
          };

          // Build role-specific profile and set status based on role
          switch (role) {
            case UserRole.BUYER:
              userData.status = UserStatus.ACTIVE; // Buyers can be active immediately
              userData.profile = {
                role: UserRole.BUYER,
                // phone is optional for buyers
              };
              break;

            case UserRole.SELLER:
              // Seller needs additional info - mark as pending
              userData.status = UserStatus.PENDING;
              userData.profile = {
                role: UserRole.SELLER,
                phone: '', // Required - needs to be collected
                businessName: '', // Required - needs to be collected
                einNumber: '', // Required - needs to be collected
                salesTaxId: '', // Required - needs to be collected
                addresses: [],
                
                localDelivery: false,
              };
              break;

            case UserRole.DRIVER:
              // Driver needs additional info - mark as pending
              userData.status = UserStatus.PENDING;
              userData.profile = {
                role: UserRole.DRIVER,
                phone: '', // Required - needs to be collected
                addresses: [],
                driverLicense: {
                  number: '', // Required - needs to be collected
                  verified: false,
                },
                vehicle: [],
                
              };
              break;
          }

          user = await UserModal.create(userData);

          logger.info('New user created via Google OAuth', { userId: user._id, email: user.email });
        } else {
          // Update existing user with Google info if needed
          let needsUpdate = false;
          
          // Add Google ID if not set (using type assertion for now)
          if (!(user as any).googleId) {
            (user as any).googleId = profile.id;
            user.authType = AuthType.GOOGLE;
            needsUpdate = true;
          }
          
          // Update avatar if not set
          if (!user.avatar && profile.photos?.[0]?.value) {
            user.avatar = profile.photos[0].value;
            needsUpdate = true;
          }
          
          // Update display name if not set
          if (!user.displayName && profile.displayName) {
            user.displayName = profile.displayName;
            needsUpdate = true;
          }
          
          // Save updates if needed
          if (needsUpdate) {
            await user.save();
          }
          
          logger.info('Existing user logged in via Google OAuth', { 
            userId: user._id, 
            email: user.email,
            role: user.role 
          });
        }

        return done(null, user);
      } catch (error) {
        logger.error('Google OAuth error', { error, googleId: profile.id });
        return done(error, null);
      }
    }
  )
);

export default passport;