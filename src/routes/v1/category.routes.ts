import { Router } from 'express';
import {
  createCategory,
  getCategories,
  getCategoryById,
  getCategoryBySlug,
  updateCategory,
  deleteCategory,
  toggleCategoryStatus
} from '../../controllers/category/category.controller';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import { UserRole } from '@/models/user/user.types';

const router = Router();

// Public routes
router.get('/', getCategories);
router.get('/slug/:slug', getCategoryBySlug);
router.get('/:id', getCategoryById);

// Admin only routes
router.post('/', authenticate, authorize(UserRole.ADMIN), createCategory);
router.put('/:id', authenticate, authorize(UserRole.ADMIN), updateCategory);
router.patch('/:id/toggle-status', authenticate, authorize(UserRole.ADMIN), toggleCategoryStatus);
router.delete('/:id', authenticate, authorize(UserRole.ADMIN), deleteCategory);

export default router;