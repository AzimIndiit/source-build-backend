import { Router } from 'express';
import otpController from '@/controllers/otp/otp.controller.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: OTP
 *   description: OTP management endpoints
 */

/**
 * @swagger
 * /api/v1/otp/create:
 *   post:
 *     summary: Create and send OTP
 *     tags: [OTP]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - type
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *               type:
 *                 type: string
 *                 enum: [UR, FP, UU]
 *                 description: OTP type (UR=User Registration, FP=Forgot Password, UU=Update User)
 *              
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                     otpSent:
 *                       type: boolean
 *       400:
 *         description: Bad request or rate limit exceeded
 *       404:
 *         description: User not found
 *       429:
 *         description: Too many requests
 */
router.post('/create', otpController.createOtp);

/**
 * @swagger
 * /api/v1/otp/verify:
 *   post:
 *     summary: Verify OTP
 *     tags: [OTP]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *               - type
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *               otp:
 *                 type: string
 *                 pattern: '^\d{6}$'
 *                 description: 6-digit OTP code
 *               type:
 *                 type: string
 *                 enum: [UR, FP, UU]
 *                 description: OTP type
 *               path:
 *                 type: string
 *                 description: Optional path parameter
 *     responses:
 *       200:
 *         description: OTP verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     isVerified:
 *                       type: boolean
 *                     user:
 *                       type: object
 *                       description: User object (only for UR type)
 *                     tokens:
 *                       type: object
 *                       description: Authentication tokens (only for UR type)
 *       400:
 *         description: Invalid or expired OTP
 *       404:
 *         description: User not found
 */
router.post('/verify', otpController.verifyOtp);

/**
 * @swagger
 * /api/v1/otp/resend:
 *   post:
 *     summary: Resend OTP
 *     tags: [OTP]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - type
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *               type:
 *                 type: string
 *                 enum: [UR, FP, UU]
 *                 description: OTP type
 *     responses:
 *       200:
 *         description: OTP resent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                     otpSent:
 *                       type: boolean
 *       400:
 *         description: Bad request
 *       404:
 *         description: User not found
 *       429:
 *         description: Too many requests
 */
router.post('/resend', otpController.resendOtp);

/**
 * @swagger
 * /api/v1/otp/health:
 *   get:
 *     summary: Check OTP service health
 *     tags: [OTP]
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                     service:
 *                       type: string
 */
router.get('/health', otpController.healthCheck);

export default router;