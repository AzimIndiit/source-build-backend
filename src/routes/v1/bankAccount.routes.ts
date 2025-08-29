import { Router } from 'express';
import { authenticate } from '@/middlewares/auth.middleware.js';
import * as bankAccountController from '@/controllers/bankAccount/bankAccount.controller.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Bank account management routes
router.post('/', bankAccountController.createBankAccount);
router.get('/', bankAccountController.getUserBankAccounts);
router.get('/default', bankAccountController.getDefaultBankAccount);
router.get('/:id', bankAccountController.getBankAccount);
router.patch('/:id', bankAccountController.updateBankAccount);
router.delete('/:id', bankAccountController.deleteBankAccount);
router.patch('/:id/set-default', bankAccountController.setDefaultBankAccount);

export default router;