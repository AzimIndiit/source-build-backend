import { Router } from 'express';
import {
  createSubcategory,
  getSubcategories,
  getSubcategoryById,
  getSubcategoryBySlug,
  getSubcategoriesByCategory,
  updateSubcategory,
  deleteSubcategory,
  toggleSubcategoryStatus
} from '../../controllers/subcategory/subcategory.controller';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import { UserRole } from '@/models/user/user.types';

const router = Router();

// Public routes
router.get('/', getSubcategories);
router.get('/slug/:slug', getSubcategoryBySlug);
router.get('/category/:categoryId', getSubcategoriesByCategory);
router.get('/:id', getSubcategoryById);

// Admin only routes
router.post('/', authenticate, authorize(UserRole.ADMIN), createSubcategory);
router.put('/:id', authenticate, authorize(UserRole.ADMIN), updateSubcategory);
router.patch('/:id/toggle-status', authenticate, authorize(UserRole.ADMIN), toggleSubcategoryStatus);
router.delete('/:id', authenticate, authorize(UserRole.ADMIN), deleteSubcategory);

export default router;