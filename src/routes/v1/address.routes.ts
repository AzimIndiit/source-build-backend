import { Router } from 'express';
import {
  createAddress,
  getUserAddresses,
  getAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  getDefaultAddress,
  getAddressStatistics,
  validateAddressOwnership
} from '@controllers/address.controller.js';
import { authenticate } from '@middlewares/auth.middleware.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Address routes
router.get('/', getUserAddresses);
router.post('/', createAddress);
router.get('/default', getDefaultAddress);
router.get('/statistics', getAddressStatistics);
router.get('/:id', getAddress);
router.put('/:id', updateAddress);
router.delete('/:id', deleteAddress);
router.post('/:id/set-default', setDefaultAddress);
router.get('/:id/validate-ownership', validateAddressOwnership);

export default router;