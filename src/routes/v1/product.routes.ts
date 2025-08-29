import { Router } from 'express';
import { authenticate } from '@middlewares/auth.middleware.js';
import * as productController from '@controllers/products/product.controller.js';
const router = Router();

router.get(
  '/',
  productController.getProducts
);

router.get(
  '/:slug',
  productController.getProductBySlug
);

router.post(
  '/',
  authenticate,
  productController.createProduct
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