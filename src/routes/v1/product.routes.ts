import { Router } from 'express';
import { authenticate, optionalAuthenticate } from '@middlewares/auth.middleware.js';
import * as productController from '@controllers/products/product.controller.js';
const router = Router();

router.get(
  '/',
  optionalAuthenticate,
  productController.getProducts
);

router.get(
  '/id/:id',
  optionalAuthenticate,
  productController.getProductById
);

router.get(
  '/:slug',
  optionalAuthenticate,
  productController.getProductBySlug
);

router.post(
  '/',
  authenticate,
  productController.createProduct
);

router.post(
  '/draft',
  authenticate,
  productController.createProductDraft
);

router.patch(
  '/:id',
  authenticate,
   productController.createProductDraft
);

router.put(
  '/:id',
  authenticate,
   productController.updateProduct
);

router.delete(
  '/:id',
  authenticate,
  productController.deleteProduct
);

router.patch(
  '/:id/status',
  authenticate,
  productController.toggleProductStatus
);

router.patch(
  '/:id/stock',
  authenticate,
  productController.updateProductStock
);

export default router;