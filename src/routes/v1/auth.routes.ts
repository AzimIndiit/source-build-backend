import { Router } from 'express'
import authController from '@controllers/auth/auth.controller.js'
import completeProfileController from '@controllers/auth/complete-profile.controller.js'
import { authenticate } from '@middlewares/auth.middleware.js'
import '@config/passport.js' // Initialize passport strategies

const router = Router()

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *   schemas:
 *     Address:
 *       type: object
 *       properties:
 *         street:
 *           type: string
 *           minLength: 1
 *           maxLength: 200
 *         city:
 *           type: string
 *           minLength: 1
 *           maxLength: 100
 *         state:
 *           type: string
 *           minLength: 1
 *           maxLength: 100
 *         country:
 *           type: string
 *           minLength: 1
 *           maxLength: 100
 *         zipCode:
 *           type: string
 *           minLength: 1
 *           maxLength: 20
 *         isDefault:
 *           type: boolean
 *           default: false
 *         type:
 *           type: string
 *           enum: [shipping, billing, both]
 *           default: both
 *       required:
 *         - street
 *         - city
 *         - state
 *         - country
 *         - zipCode
 *     
 *     BuyerProfile:
 *       type: object
 *       properties:
 *         role:
 *           type: string
 *           enum: [buyer]
 *         phone:
 *           type: string
 *           pattern: '^[2-9]\d{2}[2-9]\d{6}$'
 *           description: Optional 10-digit phone number for buyers
 *         cellPhone:
 *           type: string
 *           pattern: '^[2-9]\d{2}[2-9]\d{6}$'
 *           description: Optional cell phone number
 *         addresses:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Address'
 *           default: []
 *     
 *     SellerProfile:
 *       type: object
 *       required:
 *         - role
 *         - phone
 *         - businessName
 *         - einNumber
 *         - salesTaxId
 *       properties:
 *         role:
 *           type: string
 *           enum: [seller]
 *         phone:
 *           type: string
 *           pattern: '^[2-9]\d{2}[2-9]\d{6}$'
 *           description: Required 10-digit phone number for sellers
 *         cellPhone:
 *           type: string
 *           pattern: '^[2-9]\d{2}[2-9]\d{6}$'
 *           description: Optional cell phone number
 *         businessName:
 *           type: string
 *           minLength: 2
 *         einNumber:
 *           type: string
 *           minLength: 1
 *         salesTaxId:
 *           type: string
 *           minLength: 1
 *         businessAddress:
 *           type: string
 *         localDelivery:
 *           type: boolean
 *           default: false
 *         addresses:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Address'
 *           default: []
 *     
 *     DriverProfile:
 *       type: object
 *       required:
 *         - role
 *         - phone
 *         - driverLicense
 *       properties:
 *         role:
 *           type: string
 *           enum: [driver]
 *         phone:
 *           type: string
 *           pattern: '^[2-9]\d{2}[2-9]\d{6}$'
 *           description: Required 10-digit phone number for drivers
 *         cellPhone:
 *           type: string
 *           pattern: '^[2-9]\d{2}[2-9]\d{6}$'
 *           description: Optional cell phone number
 *         driverLicense:
 *           type: object
 *           required:
 *             - number
 *             - licenceImages
 *           properties:
 *             number:
 *               type: string
 *               minLength: 1
 *             licenceImages:
 *               type: array
 *               items:
 *                 type: string
 *               minItems: 1
 *             verified:
 *               type: boolean
 *         vehicles:
 *           type: array
 *           items:
 *             type: object
 *             required:
 *               - make
 *               - model
 *               - vehicleImages
 *               - insuranceImages
 *               - registrationNumber
 *             properties:
 *               make:
 *                 type: string
 *               model:
 *                 type: string
 *               vehicleImages:
 *                 type: array
 *                 items:
 *                   type: string
 *                 minItems: 1
 *               insuranceImages:
 *                 type: array
 *                 items:
 *                   type: string
 *                 minItems: 1
 *               registrationNumber:
 *                 type: string
 *                 minLength: 1
 *         addresses:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Address'
 *           default: []
 *     
 *     RegisterBuyerRequest:
 *       type: object
 *       required:
 *         - firstName
 *         - lastName
 *         - email
 *         - password
 *         - confirmPassword
 *         - role
 *         - termsAccepted
 *       properties:
 *         firstName:
 *           type: string
 *           minLength: 1
 *         lastName:
 *           type: string
 *           minLength: 1
 *         email:
 *           type: string
 *           format: email
 *         password:
 *           type: string
 *           minLength: 8
 *           pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9])'
 *           description: Must contain at least 8 characters, one uppercase, one lowercase, one number and one special character
 *         confirmPassword:
 *           type: string
 *         role:
 *           type: string
 *           enum: [buyer]
 *         phone:
 *           type: string
 *           pattern: '^[2-9]\d{2}[2-9]\d{6}$'
 *           description: Optional for buyers
 *         cellPhone:
 *           type: string
 *           pattern: '^[2-9]\d{2}[2-9]\d{6}$'
 *         termsAccepted:
 *           type: boolean
 *           enum: [true]
 *     
 *     RegisterSellerRequest:
 *       type: object
 *       required:
 *         - firstName
 *         - lastName
 *         - email
 *         - password
 *         - confirmPassword
 *         - role
 *         - phone
 *         - businessName
 *         - einNumber
 *         - salesTaxId
 *         - termsAccepted
 *       properties:
 *         firstName:
 *           type: string
 *           minLength: 1
 *         lastName:
 *           type: string
 *           minLength: 1
 *         email:
 *           type: string
 *           format: email
 *         password:
 *           type: string
 *           minLength: 8
 *           pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9])'
 *           description: Must contain at least 8 characters, one uppercase, one lowercase, one number and one special character
 *         confirmPassword:
 *           type: string
 *         role:
 *           type: string
 *           enum: [seller]
 *         phone:
 *           type: string
 *           pattern: '^[2-9]\d{2}[2-9]\d{6}$'
 *           description: Required for sellers
 *         cellPhone:
 *           type: string
 *           pattern: '^[2-9]\d{2}[2-9]\d{6}$'
 *         businessName:
 *           type: string
 *           minLength: 2
 *         einNumber:
 *           type: string
 *           minLength: 1
 *         salesTaxId:
 *           type: string
 *           minLength: 1
 *         businessAddress:
 *           type: string
 *         localDelivery:
 *           type: boolean
 *           default: false
 *         termsAccepted:
 *           type: boolean
 *           enum: [true]
 *     
 *     RegisterDriverRequest:
 *       type: object
 *       required:
 *         - firstName
 *         - lastName
 *         - email
 *         - password
 *         - confirmPassword
 *         - role
 *         - phone
 *         - driverLicense
 *         - vehicles
 *         - termsAccepted
 *       properties:
 *         firstName:
 *           type: string
 *           minLength: 1
 *         lastName:
 *           type: string
 *           minLength: 1
 *         email:
 *           type: string
 *           format: email
 *         password:
 *           type: string
 *           minLength: 8
 *           pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9])'
 *           description: Must contain at least 8 characters, one uppercase, one lowercase, one number and one special character
 *         confirmPassword:
 *           type: string
 *         role:
 *           type: string
 *           enum: [driver]
 *         phone:
 *           type: string
 *           pattern: '^[2-9]\d{2}[2-9]\d{6}$'
 *           description: Required for drivers
 *         cellPhone:
 *           type: string
 *           pattern: '^[2-9]\d{2}[2-9]\d{6}$'
 *         driverLicense:
 *           type: object
 *           required:
 *             - number
 *             - licenceImages
 *           properties:
 *             number:
 *               type: string
 *               minLength: 1
 *         licenceImages:
 *           type: array
 *           items:
 *             type: string
 *           minItems: 1
 *         vehicleType:
 *           type: string
 *         vehicleMake:
 *           type: string
 *         vehicleModel:
 *           type: string
 *         vehicleImages:
 *           type: array
 *           items:
 *             type: string
 *           minItems: 1
 *         insuranceImages:
 *           type: array
 *           items:
 *             type: string
 *           minItems: 1
 *         vehicleRegistrationNumber:
 *           type: string
 *           minLength: 1
 *         termsAccepted:
 *           type: boolean
 *           enum: [true]
 *     
 *     LoginRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *         password:
 *           type: string
 *           minLength: 1
 *         rememberMe:
 *           type: boolean
 *           default: false
 *     
 *     ForgotPasswordRequest:
 *       type: object
 *       required:
 *         - email
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *     
 *     ResetPasswordRequest:
 *       type: object
 *       required:
 *         - token
 *         - password
 *         - confirmPassword
 *       properties:
 *         token:
 *           type: string
 *           minLength: 1
 *         password:
 *           type: string
 *           minLength: 8
 *           pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9])'
 *         confirmPassword:
 *           type: string
 *     
 *     RefreshTokenRequest:
 *       type: object
 *       properties:
 *         refreshToken:
 *           type: string
 *           description: Can be provided in body or as httpOnly cookie
 *     
 *     AuthTokens:
 *       type: object
 *       properties:
 *         accessToken:
 *           type: string
 *         refreshToken:
 *           type: string
 *         expiresIn:
 *           type: number
 *           description: Access token expiry in seconds
 *     
 *     UserResponse:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         email:
 *           type: string
 *         role:
 *           type: string
 *           enum: [buyer, seller, driver, admin]
 *         status:
 *           type: string
 *           enum: [pending, active, inactive, suspended]
 *         isEmailVerified:
 *           type: boolean
 *         profile:
 *           oneOf:
 *             - $ref: '#/components/schemas/BuyerProfile'
 *             - $ref: '#/components/schemas/SellerProfile'
 *             - $ref: '#/components/schemas/DriverProfile'
 *         authType:
 *           type: string
 *           enum: [email, google]
 *         termsAccepted:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     
 *     RegisterResponse:
 *       type: object
 *       properties:
 *         user:
 *           $ref: '#/components/schemas/UserResponse'
 *         tokens:
 *           $ref: '#/components/schemas/AuthTokens'
 *         otpSent:
 *           type: boolean
 *         message:
 *           type: string
 *     
 *     LoginResponse:
 *       type: object
 *       properties:
 *         user:
 *           $ref: '#/components/schemas/UserResponse'
 *         tokens:
 *           $ref: '#/components/schemas/AuthTokens'
 *     
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           enum: [error, fail]
 *         message:
 *           type: string
 *         errors:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               field:
 *                 type: string
 *               message:
 *                 type: string
 *               code:
 *                 type: string
 *         stack:
 *           type: string
 *           description: Only included in development environment
 */

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Register a new user
 *     description: Register a new user with role-specific validation. Different roles require different fields.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - $ref: '#/components/schemas/RegisterBuyerRequest'
 *               - $ref: '#/components/schemas/RegisterSellerRequest'
 *               - $ref: '#/components/schemas/RegisterDriverRequest'
 *           examples:
 *             buyer:
 *               summary: Buyer Registration
 *               value:
 *                 email: buyer@example.com
 *                 password: SecurePass123!
 *                 confirmPassword: SecurePass123!
 *                 role: buyer
 *                 termsAccepted: true
 *             buyerWithPhone:
 *               summary: Buyer Registration with Phone
 *               value:
 *                 email: buyer@example.com
 *                 password: SecurePass123!
 *                 confirmPassword: SecurePass123!
 *                 role: buyer
 *                 phone: "5555551234"
 *                 termsAccepted: true
 *             seller:
 *               summary: Seller Registration
 *               value:
 *                 email: seller@example.com
 *                 password: SecurePass123!
 *                 confirmPassword: SecurePass123!
 *                 role: seller
 *                 phone: "5555551234"
 *                 businessName: My Business LLC
 *                 einNumber: 12-3456789
 *                 salesTaxId: TX123456
 *                 businessAddress: 123 Business St
 *                 localDelivery: true
 *                 termsAccepted: true
 *             driver:
 *               summary: Driver Registration
 *               value:
 *                 email: driver@example.com
 *                 password: SecurePass123!
 *                 confirmPassword: SecurePass123!
 *                 role: driver
 *                 phone: "5555551234"
 *                 driverLicenseNumber: DL123456789
 *                 driverLicenseExpiry: "2025-12-31"
 *                 driverLicenseState: TX
 *                 licenceImages: ["license-front.jpg", "license-back.jpg"]
 *                 vehicleType: sedan
 *                 vehicleMake: Toyota
 *                 vehicleModel: Camry
 *                 vehicleImages: ["vehicle-front.jpg", "vehicle-side.jpg"]
 *                 insuranceImages: ["insurance-card.jpg"]
 *                 vehicleRegistrationNumber: REG123456
 *                 termsAccepted: true
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: User registered successfully
 *                 data:
 *                   $ref: '#/components/schemas/RegisterResponse'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - Admin registration not allowed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Conflict - User already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       422:
 *         description: Validation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/register', authController.register)

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Login user
 *     description: Login with email and password. Returns access and refresh tokens.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *           example:
 *             email: user@example.com
 *             password: SecurePass123!
 *             rememberMe: false
 *     responses:
 *       200:
 *         description: Login successful
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: string
 *             description: HTTP-only cookies containing tokens
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Login successful
 *                 data:
 *                   $ref: '#/components/schemas/LoginResponse'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       422:
 *         description: Validation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/login', authController.login)

/**
 * @swagger
 * /api/v1/auth/google:
 *   get:
 *     summary: Initiate Google OAuth login
 *     description: Redirects to Google OAuth consent screen. Role must be specified.
 *     tags: [Authentication]
 *     parameters:
 *       - in: query
 *         name: role
 *         required: true
 *         schema:
 *           type: string
 *           enum: [buyer, seller, driver]
 *         description: User role for registration
 *     responses:
 *       302:
 *         description: Redirect to Google OAuth
 *       400:
 *         description: Invalid or missing role parameter
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Admin registration via Google not allowed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/google', authController.googleLogin)

/**
 * @swagger
 * /api/v1/auth/google/callback:
 *   get:
 *     summary: Google OAuth callback
 *     description: Handles Google OAuth callback. Creates new user or logs in existing user.
 *     tags: [Authentication]
 *     parameters:
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *         description: Authorization code from Google
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *         description: State parameter containing role
 *     responses:
 *       302:
 *         description: Redirect to frontend with tokens
 *       401:
 *         description: Authentication failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/google/callback', authController.googleCallback)

/**
 * @swagger
 * /api/v1/auth/google/failure:
 *   get:
 *     summary: Google OAuth failure handler
 *     description: Handles failed Google OAuth attempts
 *     tags: [Authentication]
 *     responses:
 *       302:
 *         description: Redirect to frontend with error
 */
router.get('/google/failure', authController.googleFailure)

/**
 * @swagger
 * /api/v1/auth/complete-profile:
 *   post:
 *     summary: Complete profile for OAuth users
 *     description: Complete profile information for users who registered via OAuth. Required for sellers and drivers.
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - type: object
 *                 title: Seller Profile Completion
 *                 required:
 *                   - phone
 *                   - businessName
 *                   - einNumber
 *                   - salesTaxId
 *                 properties:
 *                   phone:
 *                     type: string
 *                   businessName:
 *                     type: string
 *                   einNumber:
 *                     type: string
 *                   salesTaxId:
 *                     type: string
 *                   businessAddress:
 *                     type: string
 *                   localDelivery:
 *                     type: boolean
 *               - type: object
 *                 title: Driver Profile Completion
 *                 required:
 *                   - phone
 *                   - driverLicenseNumber
 *                   - driverLicenseExpiry
 *                   - driverLicenseState
 *                 properties:
 *                   phone:
 *                     type: string
 *                   driverLicenseNumber:
 *                     type: string
 *                   driverLicenseExpiry:
 *                     type: string
 *                   driverLicenseState:
 *                     type: string
 *     responses:
 *       200:
 *         description: Profile completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Profile completed successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/UserResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       422:
 *         description: Validation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/complete-profile', authenticate, completeProfileController.completeProfile)

/**
 * @swagger
 * /api/v1/auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     description: Get new access token using refresh token
 *     tags: [Authentication]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RefreshTokenRequest'
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Token refreshed successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     tokens:
 *                       $ref: '#/components/schemas/AuthTokens'
 *       401:
 *         description: Invalid or expired refresh token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/refresh', authController.refreshToken)

/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     summary: Logout user
 *     description: Logout current user and invalidate refresh token
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Optional - can be provided in cookie
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Logout successful
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/logout', authenticate, authController.logout)

/**
 * @swagger
 * /api/v1/auth/logout-all:
 *   post:
 *     summary: Logout from all devices
 *     description: Logout user from all devices by invalidating all refresh tokens
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out from all devices
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Logged out from all devices successfully
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/logout-all', authenticate, authController.logoutFromAllDevices)

/**
 * @swagger
 * /api/v1/auth/forgot-password:
 *   post:
 *     summary: Request password reset
 *     description: Send password reset link to user's email
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ForgotPasswordRequest'
 *           example:
 *             email: user@example.com
 *     responses:
 *       200:
 *         description: Password reset email sent
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: If an account with that email exists, a password reset link has been sent
 *                 data:
 *                   type: object
 *                   properties:
 *                     resetToken:
 *                       type: string
 *                       description: Only in development mode
 *       422:
 *         description: Validation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/forgot-password', authController.requestPasswordReset)

/**
 * @swagger
 * /api/v1/auth/verify-reset-token:
 *   post:
 *     summary: Verify password reset token
 *     description: Verify if a password reset token is valid
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 description: The password reset token to verify
 *           example:
 *             token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *     responses:
 *       200:
 *         description: Token is valid
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Token is valid
 *                 data:
 *                   type: object
 *                   properties:
 *                     valid:
 *                       type: boolean
 *                       example: true
 *       400:
 *         description: Invalid or expired token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/verify-reset-token', authController.verifyResetToken)

/**
 * @swagger
 * /api/v1/auth/reset-password:
 *   post:
 *     summary: Reset password
 *     description: Reset password using token from email
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ResetPasswordRequest'
 *           example:
 *             token: reset-token-from-email
 *             password: NewSecurePass123!
 *             confirmPassword: NewSecurePass123!
 *     responses:
 *       200:
 *         description: Password reset successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Password reset successfully. Please login with your new password.
 *       400:
 *         description: Invalid or expired token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       422:
 *         description: Validation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/reset-password', authController.resetPassword)

/**
 * @swagger
 * /api/v1/auth/health:
 *   get:
 *     summary: Health check
 *     description: Check if authentication service is healthy
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Service is healthy
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       example: healthy
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                     service:
 *                       type: string
 *                       example: auth-service
 */
router.get('/health', authController.healthCheck)

/**
 * @swagger
 * /api/v1/auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         email:
 *                           type: string
 *                         firstName:
 *                           type: string
 *                         lastName:
 *                           type: string
 *                         displayName:
 *                           type: string
 *                         role:
 *                           type: string
 *                         isVerified:
 *                           type: boolean
 *       401:
 *         description: User not authenticated
 */
router.get('/me', authenticate, authController.getCurrentUser)

/**
 * @swagger
 * /api/v1/auth/change-password:
 *   post:
 *     summary: Change user password
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - oldPassword
 *               - newPassword
 *             properties:
 *               oldPassword:
 *                 type: string
 *                 minLength: 8
 *                 description: Current password
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *                 pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9])'
 *                 description: Must contain at least 8 characters, one uppercase, one lowercase, one number and one special character
 *     responses:
 *       200:
 *         description: Password changed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Password changed successfully
 *       400:
 *         description: Invalid old password
 *       401:
 *         description: User not authenticated
 *       422:
 *         description: Validation failed
 */
router.post('/change-password', authenticate, authController.changePassword)

export default router