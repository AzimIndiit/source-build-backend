import { Router } from 'express';
import cmsController from '@controllers/cms.controller.js';
import { authenticate } from '@/middlewares/auth.middleware';

const router = Router();

// Protected routes for sellers to manage their CMS content
router.use('/manage', authenticate);
router.post('/manage', cmsController.upsertCmsContent);
router.get('/manage', cmsController.getAllCmsContent);
router.get('/manage/:type', cmsController.getCmsContent);
router.put('/manage/:type', cmsController.updateCmsContent);
router.delete('/manage/:type', cmsController.deleteCmsContent);

// Public routes for buyers to view seller's CMS content
router.get('/public/:sellerId', cmsController.getAllPublicCmsContent);
router.get('/public/:sellerId/:type', cmsController.getPublicCmsContent);

export default router;