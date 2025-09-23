import { Request, Response } from 'express';
import UserCartModel from '@models/cart/cart.model';
import ApiResponse from '@utils/ApiResponse.js';
import catchAsync from '@utils/catchAsync.js';
import ProductModel from '@models/product/product.model.js';
import ApiError from '@/utils/ApiError';

// Get user's cart with real-time product data
export const getCart = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;

  // If user is not authenticated, return empty cart
  if (!userId) {
    return ApiResponse.success(res, {
      _id: null,
      user: null,
      items: [],
      subtotal: 0,
      totalItems: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }, 'Cart fetched successfully');
  }

  let cart = await UserCartModel.findOne({ user: userId });
  
  if (!cart) {
    cart = await UserCartModel.create({
      user: userId,
      items: []
    });
  }

  // Populate product data in real-time
  const populatedItems = await Promise.all(
    cart.items.map(async (item) => {
      try {
        const product = await ProductModel.findById(item.productId);
        
        if (!product) {
          // Product deleted
          return {
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
            product: null,
            isDeleted: true,
          };
        }

        // Get variant details if specified
        let variant = null;
        let currentPrice = product.price || 0;
        let originalPrice = product.price || 0;
        let inStock = product.outOfStock !== true;
        let stockQuantity = product.quantity || 0;

        if (item.variantId && product.variants) {
          variant = product.variants.find(
            v => v.color === item.variantId  // Use color as variant identifier
          );
          
          if (variant) {
            currentPrice = variant.price || product.price || 0;
            originalPrice = variant.price || product.price || 0;
            inStock = variant.outOfStock !== true;
            stockQuantity = variant.quantity || 0;
          }
        }

        // Apply current discounts
        const discount = variant?.discount || product.discount;
        if (discount && discount.discountType !== 'none' && discount.discountValue) {
          if (discount.discountType === 'flat') {
            currentPrice = Math.max(0, originalPrice - discount.discountValue);
          } else if (discount.discountType === 'percentage') {
            currentPrice = originalPrice * (1 - discount.discountValue / 100);
          }
        }

        return {
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          addedAt: item.addedAt,
          // Real-time product data
          product: {
            _id: product._id,
            title: product.title,
            slug: product.slug,
            description: product.description,
            images: (variant?.images && variant.images.length > 0) ? variant.images : product.images,
            brand: product.brand,
            category: product.category,
            color: variant?.color || product.color,
            size: variant?.size,
            attributes: variant?.attributes,
            seller: product.seller,
          },
          currentPrice,
          originalPrice,
          discount,
          inStock,
          stockQuantity,
          outOfStock: !inStock,
          isDeleted: false,
        };
      } catch (error) {
        console.error('Error fetching product:', error);
        return {
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          product: null,
          isDeleted: true,
        };
      }
    })
  );

  // Calculate totals
  const subtotal = populatedItems.reduce((total, item) => {
    if (item.product && item.currentPrice) {
      return total + (item.currentPrice * item.quantity);
    }
    return total;
  }, 0);

  const totalItems = populatedItems.reduce((total, item) => total + item.quantity, 0);

  const response = {
    _id: cart._id,
    user: cart.user,
    items: populatedItems,
    subtotal,
    totalItems,
    createdAt: cart.createdAt,
    updatedAt: cart.updatedAt,
  };

  return ApiResponse.success(res, response, 'Cart fetched successfully');
});

// Add item to cart
export const addToCart = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { productId, variantId, quantity = 1 } = req.body;

  // Check if user is authenticated
  if (!userId) {
    throw ApiError.unauthorized('Please login to add items to cart');
  }

  // Validate product exists
  const product = await ProductModel.findById(productId);
  if (!product) {
    throw ApiError.notFound('Product not found');
  }

  // Validate variant if specified
  let variant = null;
  if (variantId) {
    variant = product.variants?.find(
      v => v.color === variantId  // Use color as variant identifier
    );
    if (!variant && variantId) {
      throw ApiError.notFound('Product variant not found');
    }
  }

  // Check stock
  const inStock = variant 
    ? variant.outOfStock !== true 
    : product.outOfStock !== true;
  const availableQuantity = (variant ? variant.quantity : product.quantity) || 0;

  if (!inStock || availableQuantity < quantity) {
    throw ApiError.badRequest('Insufficient stock');
  }

  // Find or create cart
  let cart = await UserCartModel.findOne({ user: userId });
  
  if (!cart) {
    cart = await UserCartModel.create({
      user: userId,
      items: []
    });
  }

  // Check if item already exists in cart
  const existingItemIndex = cart.items.findIndex(
    item => item.productId.toString() === productId && 
            item.variantId === variantId
  );

  if (existingItemIndex > -1) {
    // Update quantity
    const newQuantity = cart.items[existingItemIndex].quantity + quantity;
    if (newQuantity > availableQuantity) {
      throw ApiError.badRequest('Insufficient stock');
    }
    cart.items[existingItemIndex].quantity = newQuantity;
  } else {
    // Add new item
    cart.items.push({
      productId: productId as any,
      variantId: variantId || undefined,
      quantity,
      addedAt: new Date()
    });
  }

  await cart.save();

  // Return populated cart
  return getCart(req, res, next);
});

// Update cart item quantity
export const updateCartItem = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { productId, variantId, quantity } = req.body;

  // Check if user is authenticated
  if (!userId) {
    throw ApiError.unauthorized('Please login to update cart');
  }

  const cart = await UserCartModel.findOne({ user: userId });
  
  if (!cart) {
    throw ApiError.notFound('Cart not found');
  }

  const itemIndex = cart.items.findIndex(
    item => item.productId.toString() === productId && 
            item.variantId === variantId
  );

  if (itemIndex === -1) {
    throw ApiError.notFound('Item not found in cart');
  }

  if (quantity === 0) {
    // Remove item
    cart.items.splice(itemIndex, 1);
  } else {
    // Check stock for new quantity
    const product = await ProductModel.findById(productId);
    if (product) {
      const variant = variantId && product.variants 
        ? product.variants.find(v => 
            v.color === variantId  // Use color as variant identifier
          )
        : null;
      
      const availableQuantity = variant ? variant.quantity : product.quantity;
      if (availableQuantity < quantity) {
        throw ApiError.badRequest('Insufficient stock');
      }
    }
    
    cart.items[itemIndex].quantity = quantity;
  }

  await cart.save();
  
  // Return populated cart
  return getCart(req, res, next);
});

// Remove item from cart
export const removeFromCart = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { productId, variantId } = req.params;

  // Check if user is authenticated
  if (!userId) {
    throw ApiError.unauthorized('Please login to remove items from cart');
  }

  const cart = await UserCartModel.findOne({ user: userId });
  
  if (!cart) {
    throw ApiError.notFound('Cart not found');
  }

  const itemIndex = cart.items.findIndex(
    item => item.productId.toString() === productId && 
            (!variantId || item.variantId === variantId)
  );

  if (itemIndex === -1) {
    throw ApiError.notFound('Item not found in cart');
  }

  cart.items.splice(itemIndex, 1);
  await cart.save();

  // Return populated cart
  return getCart(req, res, next);
});

// Clear cart
export const clearCart = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;

  // Check if user is authenticated
  if (!userId) {
    throw ApiError.unauthorized('Please login to clear cart');
  }

  const cart = await UserCartModel.findOne({ user: userId });
  
  if (!cart) {
    throw ApiError.notFound('Cart not found');
  }

  cart.items = [];
  await cart.save();

  return ApiResponse.success(res, {
    _id: cart._id,
    user: cart.user,
    items: [],
    subtotal: 0,
    totalItems: 0,
    createdAt: cart.createdAt,
    updatedAt: cart.updatedAt,
  }, 'Cart cleared successfully');
});