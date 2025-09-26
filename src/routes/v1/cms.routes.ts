import { Router } from 'express';
import cmsController from '@controllers/cms.controller.js';
import { optionalAuthenticate } from '@/middlewares/auth.middleware';

const router = Router();

// Protected routes for sellers to manage their CMS content
router.use('/manage', optionalAuthenticate);
router.post('/manage', cmsController.upsertCmsContent);
router.get('/manage', cmsController.getAllCmsContent);
router.get('/manage/:type', cmsController.getCmsContent);
router.put('/manage/:type', cmsController.updateCmsContent);
router.delete('/manage/:type', cmsController.deleteCmsContent);

// Protected routes for CMS pages
router.get('/pages', optionalAuthenticate, cmsController.getAllPages);
router.get('/pages/:slug', optionalAuthenticate, cmsController.getPageBySlug);
router.post('/pages', optionalAuthenticate, cmsController.upsertPage);
router.put('/pages/:id', optionalAuthenticate, cmsController.upsertPage);

// Section-specific update routes (PATCH for partial updates)
router.patch('/pages/:pageId/sections/hero/:sectionId', optionalAuthenticate, cmsController.updateBannerSection);
router.patch('/pages/:pageId/sections/categories/:sectionId', optionalAuthenticate, cmsController.updateCollectionSection);
router.patch('/pages/:pageId/sections/products/:sectionId', optionalAuthenticate, cmsController.updateProductSection);

// Keep PUT for backward compatibility
router.put('/pages/:pageId/sections/hero/:sectionId', optionalAuthenticate, cmsController.updateBannerSection);
router.put('/pages/:pageId/sections/categories/:sectionId', optionalAuthenticate, cmsController.updateCollectionSection);
router.put('/pages/:pageId/sections/products/:sectionId', optionalAuthenticate, cmsController.updateProductSection);

// Public routes for buyers to view seller's CMS content
router.get('/public/landing-page', cmsController.getPublicLandingPage);
router.get('/public/:sellerId', cmsController.getAllPublicCmsContent);
router.get('/public/:sellerId/:type', cmsController.getPublicCmsContent);

export default router;