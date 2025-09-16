import { Request, Response } from 'express';
import Stripe from 'stripe';
import { stripe } from '../../config/stripe.js';
import config from '../../config/index.js';
import Order from '../../models/order/order.model.js';
import { OrderStatus, PaymentStatus } from '../../models/order/order.types.js';
import { TransactionStatus, TransactionType } from '../../models/transaction/transaction.types.js';
import stripeService from '../../services/stripe.service.js';
import Product from '../../models/product/product.model.js';
import { createNotificationService } from '../../services/notification.service.js';


/**
 * Handle Stripe webhook events
 */
export const handleStripeWebhook = async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;

  if (!config.stripe.webhookSecret) {
    console.error('Stripe webhook secret not configured');
    return res.status(500).send('Webhook secret not configured');
  }

  let event: Stripe.Event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      config.stripe.webhookSecret
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.canceled':
        await handlePaymentIntentCanceled(event.data.object as Stripe.PaymentIntent);
        break;

      case 'charge.succeeded':
        await handleChargeSucceeded(event.data.object as Stripe.Charge);
        break;

      case 'charge.failed':
        await handleChargeFailed(event.data.object as Stripe.Charge);
        break;

      case 'charge.refunded':
        await handleChargeRefunded(event.data.object as Stripe.Charge);
        break;

      case 'payment_method.attached':
        await handlePaymentMethodAttached(event.data.object as Stripe.PaymentMethod);
        break;

      case 'customer.created':
        await handleCustomerCreated(event.data.object as Stripe.Customer);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Return a 200 response to acknowledge receipt of the event
    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).send('Error processing webhook');
  }
};

/**
 * Handle successful payment intent
 */
async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log('=== WEBHOOK: Payment Intent Succeeded ===');
  console.log('Payment Intent ID:', paymentIntent.id);
  console.log('Amount:', paymentIntent.amount / 100);
  console.log('Timestamp:', new Date().toISOString());

  // Handle multiple orders from metadata
  const orderIds = paymentIntent.metadata.orderIds?.split(',') || [];
  const orderNumbers = paymentIntent.metadata.orderNumbers?.split(',') || [];
  
  // Handle legacy single order format
  if (!orderIds.length && paymentIntent.metadata.orderId) {
    orderIds.push(paymentIntent.metadata.orderId);
  }
  
  if (!orderIds.length) {
    console.error('No orderIds in payment intent metadata');
    return;
  }

  // Process each order
  const processedOrders = [];
  for (const orderId of orderIds) {
    // Update order status
    const order = await Order.findById(orderId);
    if (!order) {
      console.error('Order not found:', orderId);
      continue;
    }

    // Check if this payment has already been processed (idempotency check)
    if (order.orderSummary.paymentMethod.status === PaymentStatus.COMPLETED && 
        order.orderSummary.paymentMethod.transactionId === paymentIntent.id) {
      console.log('=== DUPLICATE WEBHOOK DETECTED ===');
      console.log('Order:', order.orderNumber);
      console.log('Payment Intent:', paymentIntent.id);
      console.log('Skipping duplicate processing to prevent double inventory decrement');
      continue; // Skip duplicate processing for this order
    }

    // Update order
    order.status = OrderStatus.PROCESSING;
    order.orderSummary.paymentMethod.status = PaymentStatus.COMPLETED;
    order.orderSummary.paymentMethod.paidAt = new Date();
    order.orderSummary.paymentMethod.transactionId = paymentIntent.id;
    await order.save();
    processedOrders.push(order);
  }

  // Process transactions and inventory for all orders
  for (const order of processedOrders) {
    // Update transaction status
    await stripeService.updateTransactionStatus(
      paymentIntent.id,
      TransactionStatus.SUCCEEDED,
      {
        stripeChargeId: paymentIntent.latest_charge as string,
        processedAt: new Date(),
      }
    );

    // Update product inventory
    for (const item of order.products) {
    if (item.productRef) {
      const product = await Product.findById(item.productRef);
      console.log('BEFORE UPDATE STOCK', product);
      console.log('ORDER ITEM:', {
        productId: item.id,
        color: item.color,
        quantity: item.quantity,
        hasVariants: product?.variants?.length > 0
      });
      
      if (product) {
        // Check if the product has variants and if this order item has a color (indicating variant)
        if (product.variants && product.variants.length > 0 && item.color) {
          console.log('Looking for variant with color:', item.color);
          console.log('Available variants:', product.variants);
          
          // Find the matching variant by color
          const variantIndex = product.variants.findIndex(
            (variant: any) => variant.color === item.color
          );
          
          if (variantIndex !== -1) {
            // Calculate new quantity for the variant
            const newQuantity = Math.max(0, product.variants[variantIndex].quantity - item.quantity);
            
            // Update variant quantity and outOfStock status
            const updateData: any = {
              $inc: {
                sold: item.quantity
              },
              [`variants.${variantIndex}.quantity`]: newQuantity,
              [`variants.${variantIndex}.outOfStock`]: newQuantity === 0
            };
            
            const updatedProduct = await Product.findByIdAndUpdate(
              item.productRef,
              updateData,
              { new: true }
            );
            console.log('AFTER UPDATE STOCK (variant)', updatedProduct?.variants?.[variantIndex]);
          } else {
            // Variant not found, fall back to main quantity
            // First, calculate the new quantity
            const newQuantity = Math.max(0, product.quantity - item.quantity);
            
            const updatedProduct = await Product.findByIdAndUpdate(
              item.productRef,
              { 
                $set: {
                  quantity: newQuantity,
                  outOfStock: newQuantity === 0
                },
                $inc: { 
                  sold: item.quantity 
                } 
              },
              { new: true }
            );
            console.log('AFTER UPDATE STOCK (main - variant not found)', updatedProduct);
          }
        } else {
          // No variants or no color specified, update main quantity
          // First, calculate the new quantity
          const newQuantity = Math.max(0, product.quantity - item.quantity);
          
          const updatedProduct = await Product.findByIdAndUpdate(
            item.productRef,
            { 
              $set: {
                quantity: newQuantity,
                outOfStock: newQuantity === 0
              },
              $inc: { 
                sold: item.quantity 
              } 
            },
            { new: true }
          );
          console.log('AFTER UPDATE STOCK (main)', updatedProduct);
        }
      }
    }
  }

    // Send order confirmation notification to customer
    if (order.customer?.userRef) {
      // Handle both populated and non-populated userRef
      const userId = typeof order.customer.userRef === 'object' && order.customer.userRef._id
        ? order.customer.userRef._id.toString()
        : order.customer.userRef.toString();
        
      await createNotificationService({
        userId: userId,
        title: 'Order Confirmed',
        message: `Your order ${order.orderNumber} has been confirmed and is being processed.`,
        type: 'ORDER_CONFIRMED',
        actionUrl:`${config.FRONTEND_URL}/buying/${order.orderNumber}`,
        meta: {
          orderId: order._id.toString(),
          orderNumber: order.orderNumber,
        }
      });
    }

    // Send notification to sellers
    const uniqueSellerIds = new Set<string>();
    
    // Collect unique seller IDs from products
    for (const product of order.products) {
      if (product.seller) {
        // Handle both populated and non-populated seller references
        const sellerId = typeof product.seller === 'object' && product.seller._id
          ? product.seller._id.toString()
          : product.seller.toString();
        uniqueSellerIds.add(sellerId);
      }
    }

    // Send notification to each unique seller
    for (const sellerId of uniqueSellerIds) {
      try {
        await createNotificationService({
          userId: sellerId,
          title: 'New Order Received',
          message: `You have received a new order ${order.orderNumber}. Please prepare the items for fulfillment.`,
          type: 'NEW_ORDER',
          actionUrl: `${config.FRONTEND_URL}/seller/orders/${order.orderNumber}`,
          meta: {
            orderId: order._id.toString(),
            orderNumber: order.orderNumber,
            totalAmount: order.amount,
          }
        });
      } catch (error) {
        console.error(`Failed to send notification to seller ${sellerId}:`, error);
        // Continue with other sellers even if one fails
      }
    }

    console.log('Order updated successfully:', order.orderNumber);
  } // Close the processedOrders loop
}

/**
 * Handle failed payment intent
 */
async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.log('Payment Intent Failed:', paymentIntent.id);

  const orderId = paymentIntent.metadata.orderId;
  if (!orderId) {
    console.error('No orderId in payment intent metadata');
    return;
  }

  // Update order status
  const order = await Order.findById(orderId);
  if (!order) {
    console.error('Order not found:', orderId);
    return;
  }

  order.status = OrderStatus.CANCELLED;
  order.orderSummary.paymentMethod.status = PaymentStatus.FAILED;
  order.cancelReason = `Payment failed: ${paymentIntent.last_payment_error?.message || 'Unknown error'}`;
  await order.save();

  // Update transaction status
  await stripeService.updateTransactionStatus(
    paymentIntent.id,
    TransactionStatus.FAILED,
    {
      failureCode: paymentIntent.last_payment_error?.code,
      failureMessage: paymentIntent.last_payment_error?.message,
    }
  );

  // Send failure notification
  if (order.customer?.userRef) {
    // Handle both populated and non-populated userRef
    const userId = typeof order.customer.userRef === 'object' && order.customer.userRef._id
      ? order.customer.userRef._id.toString()
      : order.customer.userRef.toString();
      
    await createNotificationService({
      userId: userId,
      title: 'Payment Failed',
      message: `Payment for order ${order.orderNumber} has failed. Please try again.`,
      type: 'ORDER_CANCELLED',
      meta: {
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
      }
    });
  }

  console.log('Order payment failed:', order.orderNumber);
}

/**
 * Handle canceled payment intent
 */
async function handlePaymentIntentCanceled(paymentIntent: Stripe.PaymentIntent) {
  console.log('Payment Intent Canceled:', paymentIntent.id);

  const orderId = paymentIntent.metadata.orderId;
  if (!orderId) {
    console.error('No orderId in payment intent metadata');
    return;
  }

  // Update order status
  const order = await Order.findById(orderId);
  if (!order) {
    console.error('Order not found:', orderId);
    return;
  }

  order.status = OrderStatus.CANCELLED;
  order.orderSummary.paymentMethod.status = PaymentStatus.FAILED;
  order.cancelReason = 'Payment was canceled';
  await order.save();

  // Update transaction status
  await stripeService.updateTransactionStatus(
    paymentIntent.id,
    TransactionStatus.CANCELLED
  );

  console.log('Order canceled:', order.orderNumber);
}

/**
 * Handle successful charge
 */
async function handleChargeSucceeded(charge: Stripe.Charge) {
  console.log('Charge Succeeded:', charge.id);

  // Update transaction with charge details
  if (charge.payment_intent) {
    await stripeService.updateTransactionStatus(
      charge.payment_intent as string,
      TransactionStatus.SUCCEEDED,
      {
        stripeChargeId: charge.id,
        processedAt: new Date(),
      }
    );
  }

  // Record card details if available
  if (charge.payment_method_details?.card) {
    const card = charge.payment_method_details.card;
    // You can store card details for reference (last4, brand, etc.)
    console.log('Card used:', `${card.brand} ending in ${card.last4}`);
  }
}

/**
 * Handle failed charge
 */
async function handleChargeFailed(charge: Stripe.Charge) {
  console.log('Charge Failed:', charge.id);

  if (charge.payment_intent) {
    await stripeService.updateTransactionStatus(
      charge.payment_intent as string,
      TransactionStatus.FAILED,
      {
        stripeChargeId: charge.id,
        failureCode: charge.failure_code || undefined,
        failureMessage: charge.failure_message || undefined,
      }
    );
  }
}

/**
 * Handle refunded charge
 */
async function handleChargeRefunded(charge: Stripe.Charge) {
  console.log('Charge Refunded:', charge.id);

  if (charge.payment_intent) {
    // Find the order associated with this payment
    const order = await Order.findOne({
      'orderSummary.paymentMethod.transactionId': charge.payment_intent
    });

    if (order) {
      // Update order status
      order.status = OrderStatus.REFUNDED;
      order.refundReason = 'Payment refunded through Stripe';
      await order.save();

      // Handle both populated and non-populated userRef for transaction
      const userId = typeof order.customer.userRef === 'object' && order.customer.userRef._id
        ? order.customer.userRef._id.toString()
        : order.customer.userRef.toString();

      // Create refund transaction
      await stripeService.recordTransaction({
        type: TransactionType.REFUND,
        status: TransactionStatus.SUCCEEDED,
        user: userId,
        order: order._id.toString(),
        amount: charge.amount_refunded / 100,
        stripePaymentIntentId: charge.payment_intent as string,
        stripeChargeId: charge.id,
        paymentMethod: 'card',
        metadata: {
          orderNumber: order.orderNumber,
          refundAmount: charge.amount_refunded / 100,
          stripeRefundId: charge.refunds?.data[0]?.id,
        }
      });

      // Send refund notification
      if (order.customer?.userRef) {
        await createNotificationService({
          userId: userId,
          title: 'Order Refunded',
          message: `Your order ${order.orderNumber} has been refunded.`,
          type: 'ORDER_CANCELLED',
          meta: {
            orderId: order._id.toString(),
            orderNumber: order.orderNumber,
            refundAmount: charge.amount_refunded / 100,
          }
        });
      }
    }
  }
}

/**
 * Handle payment method attached
 */
async function handlePaymentMethodAttached(paymentMethod: Stripe.PaymentMethod) {
  console.log('Payment Method Attached:', paymentMethod.id);
  // You can update user's saved payment methods here
}

/**
 * Handle customer created
 */
async function handleCustomerCreated(customer: Stripe.Customer) {
  console.log('Customer Created:', customer.id);
  // You can update user record with Stripe customer ID here
}