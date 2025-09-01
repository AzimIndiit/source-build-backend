import { Router } from 'express';
import { authenticate } from '@middlewares/auth.middleware.js';
import * as productController from '@controllers/products/product.controller.js';
const router = Router();

router.get(
  '/',
  authenticate,
  productController.getProducts
);

router.get(
  '/id/:id',
  productController.getProductById
);

router.get(
  '/:slug',
  authenticate,
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
  productController.updateProduct
);

router.delete(
  '/:id',
  authenticate,
  productController.deleteProduct
);
export default router;