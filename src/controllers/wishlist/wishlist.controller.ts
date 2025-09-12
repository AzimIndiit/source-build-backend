import { Request, Response } from 'express';
import { Types } from 'mongoose';
import catchAsync from '@utils/catchAsync.js';
import ApiResponse from '@utils/ApiResponse.js';
import ApiError from '@utils/ApiError.js';
import { validate } from '@/middlewares/validation.middleware.js';
import Wishlist from '@models/wishlist/wishlist.model.js';
import Product from '@models/product/product.model.js';
import {
  addToWishlistSchema,
  removeFromWishlistSchema,
  updateWishlistItemSchema,
  setPriceAlertSchema,
  getWishlistSchema,
  checkProductInWishlistSchema,
} from '@models/wishlist/wishlist.validators.js';

export const getWishlist = [
  validate(getWishlistSchema, 'query'),
  catchAsync(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    
    if (!userId) {
      throw ApiError.unauthorized('User not authenticated');
    }

    const wishlist = await Wishlist.getWishlistWithProducts(new Types.ObjectId(userId));
    
    if (!wishlist) {
      return ApiResponse.success(res, { items: [], itemCount: 0 }, 'Wishlist retrieved successfully');
    }

    return ApiResponse.success(res, wishlist, 'Wishlist retrieved successfully');
  }),
];

export const addToWishlist = [
  validate(addToWishlistSchema, 'body'),
  catchAsync(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { productId, notificationEnabled, priceAlert } = req.body;
    
    if (!userId) {
      throw ApiError.unauthorized('User not authenticated');
    }

    const product = await Product.findById(productId);
    if (!product) {
      throw ApiError.notFound('Product not found');
    }

    let wishlist = await Wishlist.findByUser(new Types.ObjectId(userId));
    
    if (!wishlist) {
      wishlist = await Wishlist.create({
        user: userId,
        items: [],
      });
    }

    if (wishlist.hasProduct(productId)) {
      throw ApiError.badRequest('Product already in wishlist');
    }

    await wishlist.addItem(productId, notificationEnabled);

    if (priceAlert) {
      await wishlist.setPriceAlert(productId, priceAlert.targetPrice);
    }

    await wishlist.populate({
      path: 'items.product',
      select: 'title price images slug discount rating stock status',
    });

    return ApiResponse.success(res, wishlist, 'Product added to wishlist');
  }),
];

export const removeFromWishlist = [
  validate(removeFromWishlistSchema),
  catchAsync(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { productId } = req.body;
    
    if (!userId) {
      throw ApiError.unauthorized('User not authenticated');
    }

    const wishlist = await Wishlist.findByUser(new Types.ObjectId(userId));
    
    if (!wishlist) {
      throw ApiError.notFound('Wishlist not found');
    }

    if (!wishlist.hasProduct(productId)) {
      throw ApiError.notFound('Product not in wishlist');
    }

    await wishlist.removeItem(productId);

    await wishlist.populate({
      path: 'items.product',
      select: 'title price images slug discount rating stock status',
    });

    return ApiResponse.success(res, wishlist, 'Product removed from wishlist');
  }),
];

export const updateWishlistItem = [
  validate(updateWishlistItemSchema),
  catchAsync(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { productId, notificationEnabled, priceAlert } = req.body;
    
    if (!userId) {
      throw ApiError.unauthorized('User not authenticated');
    }

    const wishlist = await Wishlist.findByUser(new Types.ObjectId(userId));
    
    if (!wishlist) {
      throw ApiError.notFound('Wishlist not found');
    }

    const item = wishlist.items.find(item => item.product.toString() === productId);
    
    if (!item) {
      throw ApiError.notFound('Product not in wishlist');
    }

    if (notificationEnabled !== undefined) {
      item.notificationEnabled = notificationEnabled;
    }

    if (priceAlert) {
      await wishlist.setPriceAlert(productId, priceAlert.targetPrice);
    } else if (priceAlert === null) {
      await wishlist.removePriceAlert(productId);
    }

    await wishlist.save();

    await wishlist.populate({
      path: 'items.product',
      select: 'title price images slug discount rating stock status',
    });

    return ApiResponse.success(res, wishlist, 'Wishlist item updated');
  }),
];

export const clearWishlist = [
  catchAsync(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    
    if (!userId) {
      throw ApiError.unauthorized('User not authenticated');
    }

    const wishlist = await Wishlist.findByUser(new Types.ObjectId(userId));
    
    if (!wishlist) {
      throw ApiError.notFound('Wishlist not found');
    }

    await wishlist.clearWishlist();

    return ApiResponse.success(res, wishlist, 'Wishlist cleared');
  }),
];

export const checkProductInWishlist = [
  validate(checkProductInWishlistSchema, 'params'),
  catchAsync(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { productId } = req.params;
    
    if (!userId) {
      throw ApiError.unauthorized('User not authenticated');
    }

    const isInWishlist = await Wishlist.checkProductInWishlist(
      new Types.ObjectId(userId),
      new Types.ObjectId(productId)
    );

    return ApiResponse.success(res, { isInWishlist }, 'Check completed');
  }),
];

export const getWishlistCount = [
  catchAsync(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    
    if (!userId) {
      throw ApiError.unauthorized('User not authenticated');
    }

    const count = await Wishlist.countWishlistItems(new Types.ObjectId(userId));

    return ApiResponse.success(res, { count }, 'Wishlist count retrieved');
  }),
];

export const getPopularWishlistItems = [
  catchAsync(async (req: Request, res: Response) => {
    const limit = parseInt(String(req.query.limit || '10')) || 10;
    
    const popularItems = await Wishlist.getPopularWishlistItems(limit);
    
    const populatedItems = await Product.populate(popularItems, {
      path: 'product',
      select: 'title price images slug discount rating stock status',
    });

    return ApiResponse.success(res, populatedItems, 'Popular wishlist items retrieved');
  }),
];

export const batchCheckProducts = [
  catchAsync(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { productIds } = req.body;
    
    if (!userId) {
      throw ApiError.unauthorized('User not authenticated');
    }

    if (!Array.isArray(productIds)) {
      throw ApiError.badRequest('Product IDs must be an array');
    }

    const wishlist = await Wishlist.findByUser(new Types.ObjectId(userId));
    
    if (!wishlist) {
      return ApiResponse.success(res, {}, 'No items in wishlist');
    }

    const wishlistStatus = productIds.reduce((acc, productId) => {
      acc[productId] = wishlist.hasProduct(productId);
      return acc;
    }, {} as Record<string, boolean>);

    return ApiResponse.success(res, wishlistStatus, 'Batch check completed');
  }),
];