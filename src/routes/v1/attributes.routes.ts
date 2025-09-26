import { Router } from 'express'
import {
  createAttribute,
  getAttributes,
  getAttributeById,
  getAttributesBySubcategory,
  updateAttribute,
  deleteAttribute,
  toggleAttributeStatus
} from '../../controllers/attributes/attributes.controller'
import { authenticate, authorize } from '../../middlewares/auth.middleware'
import { UserRole } from '@/models/user/user.types'

const router = Router()

// Public routes
router.get('/', getAttributes)
router.get('/:id', getAttributeById)
router.get('/subcategory/:subcategoryId', getAttributesBySubcategory)

// Admin only routes
router.post('/', authenticate, authorize(UserRole.ADMIN), createAttribute)
router.put('/:id', authenticate, authorize(UserRole.ADMIN), updateAttribute)
router.patch('/:id/toggle-status', authenticate, authorize(UserRole.ADMIN), toggleAttributeStatus)
router.delete('/:id', authenticate, authorize(UserRole.ADMIN), deleteAttribute)

export default router