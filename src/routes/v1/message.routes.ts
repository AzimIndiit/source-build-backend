import { Router } from 'express';
import { authenticate } from '@/middlewares/auth.middleware.js';
import * as messageController from '@/controllers/message/message.controller.js';

const router = Router();

router.use(authenticate);

router.post('/send', messageController.sendMessage);
router.get('/', messageController.getMessages);
router.patch('/:id/status', messageController.updateMessageStatus);
router.post('/mark-all-read', messageController.markAllAsRead);

export default router;