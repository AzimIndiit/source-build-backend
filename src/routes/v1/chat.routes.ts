import { Router } from 'express';
import { authenticate } from '@/middlewares/auth.middleware.js';
import * as chatController from '@/controllers/chat/chat.controller.js';

const router = Router();

router.use(authenticate);

router.post('/', chatController.createChat);
router.get('/', chatController.getUserChats);
router.get('/single', chatController.getSingleChat);
router.delete('/:id', chatController.deleteChat);

export default router;