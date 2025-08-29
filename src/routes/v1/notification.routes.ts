import { Router } from 'express';
import { authenticate } from '@middlewares/auth.middleware.js';
import {
  listNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
} from '@controllers/notifications/notification.controller.js';

const router = Router();

/**
 * @route   GET /api/v1/notifications
 * @desc    List notifications for current user
 * @access  Private
 */
router.get('/', authenticate, listNotifications);

/**
 * @route   GET /api/v1/notifications/stats
 * @desc    Get notification statistics
 * @access  Private
 */

router.get('/unread-count', authenticate, getUnreadCount);

/**
 * @route   PATCH /api/v1/notifications/:id/read
 * @desc    Mark notification as read
 * @access  Private
 */
router.patch('/:id/read', authenticate, markAsRead);

/**
 * @route   PATCH /api/v1/notifications/:id/unread
 * @desc    Mark notification as unread
 * @access  Private
 */
router.patch('/mark-all-read', authenticate, markAllAsRead);

export default router;