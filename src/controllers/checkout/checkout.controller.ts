import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync.js';
import ApiResponse from '../../utils/ApiResponse.js';
import stripeService from '../../services/stripe.service.js';
import Order from '../../models/order/order.model.js';
import User from '../../models/user/user.model.js';
import { OrderStatus, PaymentStatus, PaymentMethod } from '../../models/order/order.types.js';
import { TransactionType, TransactionStatus } from '../../models/transaction/transaction.types.js';
import Transaction from '../../models/transaction/transaction.model.js';
import { UserCard } from '../../models/user-card/userCard.model.js';

/**
 * Create a payment intent for checkout
 */
export const createPaymentIntent = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const {
    items,
    deliveryMethod,
    deliveryAddress,
    paymentCardId,
    totals,
    notes
  } = req.body;

  // Validate user
  const user = await User.findById(userId);
  if (!user) {
    return ApiResponse.error(res, 'User not found', 404);
  }

  // Get or create Stripe customer
  const stripeCustomer = await stripeService.createOrGetCustomer({
    email: user.email,
    name: `${user.firstName} ${user.lastName}`,
    phone: (user as any).phone || undefined,
    metadata: {
      userId: userId.toString(),
    }
  });

  // Update user with Stripe customer ID if not already set
  if (!user.stripeCustomerId) {
    user.stripeCustomerId = stripeCustomer.id;
    await user.save();
  }

  // Filter items based on delivery method support
  // Only include items from sellers who support the selected delivery method
  const filteredItems = items.filter((item: any) => {
    if (!item.marketplaceOptions) {
      // If no marketplace options, assume all methods are supported
      return true;
    }
    
    // Check if the item supports the selected delivery method
    if (deliveryMethod === 'pickup' && item.marketplaceOptions.pickup) return true;
    if (deliveryMethod === 'delivery' && item.marketplaceOptions.delivery) return true;
    if (deliveryMethod === 'shipping' && item.marketplaceOptions.shipping) return true;
    
    return false;
  });
  
  // If no items support the selected delivery method, return error
  if (filteredItems.length === 0) {
    return ApiResponse.error(
      res, 
      `No items support ${deliveryMethod} delivery method. Please select a different delivery method.`,
      400
    );
  }
  
  // Create separate order for EACH item (maximum granularity)
  const orders = [];
  const orderIds = [];
  const orderNumbers = [];
  
  // Process each item as a separate order
  for (const item of filteredItems) {
    const sellerId = item.seller?.id || 'default';
    
    // Calculate item subtotal
    const itemSubtotal = item.price * item.quantity;
    
    // Calculate delivery fee for this single item
    let itemDeliveryFee = 0;
    if (deliveryMethod === 'shipping') {
      // Each item gets its own shipping fee
      itemDeliveryFee = item.shippingPrice || 0;
    } else if (deliveryMethod === 'delivery' || deliveryMethod === 'pickup') {
      // Proportionally split the delivery fee based on item value
      const proportion = itemSubtotal / totals.subtotal;
      itemDeliveryFee = totals.deliveryFee * proportion;
    }
    
    // Proportionally calculate tax and discount for this item
    const proportion = itemSubtotal / totals.subtotal;
    const itemTax = totals.tax * proportion;
    const itemDiscount = totals.discount * proportion;
    const itemTotal = itemSubtotal + itemDeliveryFee + itemTax - itemDiscount;
    
    // Generate unique order number for each item
    const orderNumber = await Order.generateOrderNumber();
    orderNumbers.push(orderNumber);
    
    // Create order data for this single item
    const orderData = {
      orderNumber,
      customer: {
        userRef: userId,
      },
      seller: {
        userRef: sellerId !== 'default' ? sellerId : undefined, // Set seller ID for the order
      },
      products: [{
        id: item.productId,
        title: item.title,
        price: item.price,
        quantity: item.quantity,
        image: item.image,
        color: item.color, // Include color for variant identification
        productRef: item.productId,
        seller: item.seller?.id,
      }],
      date: new Date().toISOString(),
      amount: itemTotal,
      status: OrderStatus.PENDING,
      orderSummary: {
        shippingAddress: deliveryAddress ? {
          name: deliveryAddress.name,
          phone: deliveryAddress.phone || '',
          address: deliveryAddress.street, // Map street to address
          city: deliveryAddress.city,
          state: deliveryAddress.state,
          country: deliveryAddress.country,
          zip: deliveryAddress.zipCode, // Map zipCode to zip
        } : {},
        paymentMethod: {
          type: 'card',
          method: PaymentMethod.STRIPE,
          status: PaymentStatus.PENDING,
        },
        subTotal: itemSubtotal,
        shippingFee: itemDeliveryFee,
        marketplaceFee: 0,
        taxes: itemTax,
        discount: itemDiscount,
        total: itemTotal,
      },
      deliveryInstructions: notes,
    };
    
    const order = await Order.create(orderData);
    orders.push(order);
    orderIds.push(order._id.toString());
  }

  // Get payment method ID if card was selected
  let paymentMethodId: string | undefined;
  if (paymentCardId) {
    const userCard = await UserCard.findById(paymentCardId);
    if (userCard && userCard.paymentMethodId) {
      paymentMethodId = userCard.paymentMethodId;
    }
  }

  // Create payment intent with metadata for all orders
  const paymentIntent = await stripeService.createPaymentIntent({
    amount: totals.total,
    currency: 'usd',
    customer: stripeCustomer.id,
    metadata: {
      orderIds: orderIds.join(','), // Store all order IDs
      orderNumbers: orderNumbers.join(','), // Store all order numbers
      userId: userId.toString(),
      orderCount: orders.length.toString(),
    },
    paymentMethodId,
    savePaymentMethod: false,
  });

  // Record ONE transaction for all orders
  await stripeService.recordTransaction({
    type: TransactionType.PAYMENT,
    status: TransactionStatus.PENDING,
    user: userId,
    order: orderIds[0], // Primary order ID (can be enhanced to support multiple)
    amount: totals.total, // Total amount for all orders
    stripePaymentIntentId: paymentIntent.id,
    paymentMethod: 'card',
    metadata: {
      orderIds: orderIds.join(','), // All order IDs
      orderNumbers: orderNumbers.join(','), // All order numbers
      orderCount: orders.length.toString(),
      deliveryMethod,
    }
  });
  
  // Update each order with payment intent ID
  for (const order of orders) {
    order.orderSummary.paymentMethod.transactionId = paymentIntent.id;
    await order.save();
  }

  ApiResponse.success(
    res,
    {
      orderIds: orderIds,
      orderNumbers: orderNumbers,
      orders: orders.map(order => ({
        id: order._id,
        orderNumber: order.orderNumber,
        amount: order.amount,
        seller: order.products[0]?.seller || null,
      })),
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: totals.total,
      requiresAction: paymentIntent.status === 'requires_action',
    },
    'Payment intent created successfully',
    201
  );
});

/**
 * Confirm payment after successful payment
 */
export const confirmPayment = catchAsync(async (req: Request, res: Response) => {
  const { paymentIntentId, orderId } = req.body;
  const userId = req.user?.id;

  // Get payment intent from Stripe
  const paymentIntent = await stripeService.getPaymentIntent(paymentIntentId);

  if (!paymentIntent) {
    return ApiResponse.error(res, 'Payment intent not found', 404);
  }

  // Verify the payment belongs to the user
  if (paymentIntent.metadata.userId !== userId.toString()) {
    return ApiResponse.error(res, 'Unauthorized access to payment', 403);
  }

  // Update order status based on payment status
  const order = await Order.findById(orderId);
  if (!order) {
    return ApiResponse.error(res, 'Order not found', 404);
  }

  if (paymentIntent.status === 'succeeded') {
    // Update order status
    order.status = OrderStatus.PROCESSING;
    order.orderSummary.paymentMethod.status = PaymentStatus.COMPLETED;
    order.orderSummary.paymentMethod.paidAt = new Date();
    await order.save();

    // Update transaction status
    await stripeService.updateTransactionStatus(
      paymentIntentId,
      TransactionStatus.SUCCEEDED,
      {
        stripeChargeId: paymentIntent.latest_charge as string,
        processedAt: new Date(),
      }
    );

    // NOTE: Product inventory update is handled by the Stripe webhook
    // to ensure it only happens once when payment is truly confirmed.
    // This prevents double-decrementing inventory.

    ApiResponse.success(
      res,
      {
        orderId: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.orderSummary.paymentMethod.status,
      },
      'Payment confirmed successfully'
    );
  } else if (paymentIntent.status === 'requires_action' || paymentIntent.status === 'requires_payment_method') {
    // Payment requires additional action
    await stripeService.updateTransactionStatus(
      paymentIntentId,
      TransactionStatus.REQUIRES_ACTION
    );

    ApiResponse.success(
      res,
      {
        orderId: order._id,
        requiresAction: true,
        clientSecret: paymentIntent.client_secret,
      },
      'Payment requires additional action'
    );
  } else {
    // Payment failed
    order.status = OrderStatus.CANCELLED;
    order.orderSummary.paymentMethod.status = PaymentStatus.FAILED;
    await order.save();

    await stripeService.updateTransactionStatus(
      paymentIntentId,
      TransactionStatus.FAILED,
      {
        failureCode: paymentIntent.last_payment_error?.code,
        failureMessage: paymentIntent.last_payment_error?.message,
      }
    );

    ApiResponse.error(res, 'Payment failed', 400);
  }
});

/**
 * Cancel a payment intent
 */
export const cancelPayment = catchAsync(async (req: Request, res: Response) => {
  const { paymentIntentId, orderId } = req.body;
  const userId = req.user?.id;

  // Get payment intent from Stripe
  const paymentIntent = await stripeService.getPaymentIntent(paymentIntentId);

  if (!paymentIntent) {
    return ApiResponse.error(res, 'Payment intent not found', 404);
  }

  // Verify the payment belongs to the user
  if (paymentIntent.metadata.userId !== userId.toString()) {
    return ApiResponse.error(res, 'Unauthorized access to payment', 403);
  }

  // Cancel payment intent
  await stripeService.cancelPaymentIntent(paymentIntentId);

  // Update order status
  const order = await Order.findById(orderId);
  if (order) {
    order.status = OrderStatus.CANCELLED;
    order.orderSummary.paymentMethod.status = PaymentStatus.FAILED;
    order.cancelReason = 'Payment cancelled by user';
    await order.save();
  }

  // Update transaction status
  await stripeService.updateTransactionStatus(
    paymentIntentId,
    TransactionStatus.CANCELLED
  );

  ApiResponse.success(res, null, 'Payment cancelled successfully');
});

/**
 * Get payment status
 */
export const getPaymentStatus = catchAsync(async (req: Request, res: Response) => {
  const { paymentIntentId } = req.params;
  const userId = req.user?.id;

  // Get payment intent from Stripe
  const paymentIntent = await stripeService.getPaymentIntent(paymentIntentId);

  if (!paymentIntent) {
    return ApiResponse.error(res, 'Payment intent not found', 404);
  }

  // Verify the payment belongs to the user
  if (paymentIntent.metadata.userId !== userId.toString()) {
    return ApiResponse.error(res, 'Unauthorized access to payment', 403);
  }

  // Get transaction details
  const transaction = await Transaction.findOne({ stripePaymentIntentId: paymentIntentId });

  ApiResponse.success(
    res,
    {
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency,
      paymentMethod: paymentIntent.payment_method,
      transaction: transaction ? {
        id: transaction._id,
        status: transaction.status,
        processedAt: transaction.processedAt,
      } : null,
    },
    'Payment status retrieved successfully'
  );
});

/**
 * Retry payment with a different payment method
 */
export const retryPayment = catchAsync(async (req: Request, res: Response) => {
  const { paymentIntentId, paymentMethodId } = req.body;
  const userId = req.user?.id;

  // Get payment intent from Stripe
  const paymentIntent = await stripeService.getPaymentIntent(paymentIntentId);

  if (!paymentIntent) {
    return ApiResponse.error(res, 'Payment intent not found', 404);
  }

  // Verify the payment belongs to the user
  if (paymentIntent.metadata.userId !== userId.toString()) {
    return ApiResponse.error(res, 'Unauthorized access to payment', 403);
  }

  // Confirm payment with new payment method
  const updatedPaymentIntent = await stripeService.confirmPaymentIntent(
    paymentIntentId,
    paymentMethodId
  );

  ApiResponse.success(
    res,
    {
      paymentIntentId: updatedPaymentIntent.id,
      status: updatedPaymentIntent.status,
      clientSecret: updatedPaymentIntent.client_secret,
      requiresAction: updatedPaymentIntent.status === 'requires_action',
    },
    'Payment retry initiated successfully'
  );
});