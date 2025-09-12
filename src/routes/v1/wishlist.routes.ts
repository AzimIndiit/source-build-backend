import { Router } from 'express';
import { authenticate } from '@middlewares/auth.middleware.js';
import * as wishlistController from '@controllers/wishlist/wishlist.controller.js';

const router = Router();

router.get(
  '/',
  authenticate,
  wishlistController.getWishlist
);

router.post(
  '/add',
  authenticate,
  wishlistController.addToWishlist
);

router.post(
  '/remove',
  authenticate,
  wishlistController.removeFromWishlist
);

router.patch(
  '/update',
  authenticate,
  wishlistController.updateWishlistItem
);

router.delete(
  '/clear',
  authenticate,
  wishlistController.clearWishlist
);

router.get(
  '/check/:productId',
  authenticate,
  wishlistController.checkProductInWishlist
);

router.get(
  '/count',
  authenticate,
  wishlistController.getWishlistCount
);

router.get(
  '/popular',
  wishlistController.getPopularWishlistItems
);

router.post(
  '/batch-check',
  authenticate,
  wishlistController.batchCheckProducts
);

export default router;