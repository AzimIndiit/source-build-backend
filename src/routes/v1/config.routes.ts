import { Router } from 'express';
import configController from '@/controllers/config.controller.js';

const router = Router();

/**
 * @swagger
 * /api/v1/config/public:
 *   get:
 *     summary: Get public configuration
 *     description: Get public configuration values needed by the frontend
 *     tags: [Config]
 *     responses:
 *       200:
 *         description: Configuration fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     stripe:
 *                       type: object
 *                       properties:
 *                         publishableKey:
 *                           type: string
 *                         apiVersion:
 *                           type: string
 *                     environment:
 *                       type: string
 *                     features:
 *                       type: object
 */
router.get('/public', configController.getPublicConfig);

export default router;