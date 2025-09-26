// @ts-nocheck
import { Router } from 'express';
import { authenticate, authorize } from '@middlewares/auth.middleware.js';
import { UserRole } from '@models/user/user.types.js';
import {
  createContactUs,
  getAllContactUs,
  updateContactUs,
} from '@controllers/contactus/contactus.controller.js';

const router = Router();

/**
 * @route   POST /api/v1/contact-us
 * @desc    Create a new contact us submission
 * @access  Public
 */
router.post('/', createContactUs);

/**
 * @route   GET /api/v1/contact-us
 * @desc    Get all contact us submissions
 * @access  Private (Admin)
 */
router.get('/', authenticate, authorize(UserRole.ADMIN), getAllContactUs);

/**
 * @route   PUT /api/v1/contact-us/:id
 * @desc    Update contact us submission status
 * @access  Private (Admin)
 */
router.put('/:id', authenticate, authorize(UserRole.ADMIN), updateContactUs);

export default router;