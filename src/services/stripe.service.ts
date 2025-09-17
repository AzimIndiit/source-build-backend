import Stripe from 'stripe';
import { stripe } from '../config/stripe.js';
import { IOrder } from '../models/order/order.types.js';
import { ITransaction, TransactionStatus, TransactionType } from '../models/transaction/transaction.types.js';
import Transaction from '../models/transaction/transaction.model.js';
import { Types } from 'mongoose';

class StripeService {
  private stripe: Stripe;

  constructor() {
    this.stripe = stripe;
  }

  /**
   * Create a payment intent for an order
   */
  async createPaymentIntent(params: {
    amount: number;
    currency?: string;
    customer?: string;
    metadata?: Record<string, string>;
    paymentMethodId?: string;
    savePaymentMethod?: boolean;
  }) {
    const { 
      amount, 
      currency = 'usd', 
      customer, 
      metadata = {},
      paymentMethodId,
      savePaymentMethod = false
    } = params;

    const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      metadata,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never', // Don't allow redirect-based payment methods
      },
    };

    if (customer) {
      paymentIntentParams.customer = customer;
    }

    if (paymentMethodId) {
      paymentIntentParams.payment_method = paymentMethodId;
      paymentIntentParams.confirm = true;
    }

    if (savePaymentMethod && customer) {
      paymentIntentParams.setup_future_usage = 'off_session';
    }

    const paymentIntent = await this.stripe.paymentIntents.create(paymentIntentParams);
    
    return paymentIntent;
  }

  /**
   * Confirm a payment intent
   */
  async confirmPaymentIntent(paymentIntentId: string, paymentMethodId?: string) {
    const confirmParams: Stripe.PaymentIntentConfirmParams = {};
    
    if (paymentMethodId) {
      confirmParams.payment_method = paymentMethodId;
    }

    const paymentIntent = await this.stripe.paymentIntents.confirm(
      paymentIntentId,
      confirmParams
    );
    
    return paymentIntent;
  }

  /**
   * Cancel a payment intent
   */
  async cancelPaymentIntent(paymentIntentId: string) {
    const paymentIntent = await this.stripe.paymentIntents.cancel(paymentIntentId);
    return paymentIntent;
  }

  /**
   * Get a payment intent
   */
  async getPaymentIntent(paymentIntentId: string) {
    const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
    return paymentIntent;
  }

  /**
   * Create or get a Stripe customer
   */
  async createOrGetCustomer(params: {
    email: string;
    name?: string;
    phone?: string;
    metadata?: Record<string, string>;
  }) {
    const { email, name, phone, metadata = {} } = params;

    // Check if customer exists
    const existingCustomers = await this.stripe.customers.list({
      email,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      return existingCustomers.data[0];
    }

    // Create new customer
    const customer = await this.stripe.customers.create({
      email,
      name,
      phone,
      metadata,
    });

    return customer;
  }

  /**
   * Create a refund for a payment
   */
  async createRefund(params: {
    paymentIntentId?: string;
    chargeId?: string;
    amount?: number;
    reason?: Stripe.RefundCreateParams.Reason;
    metadata?: Record<string, string>;
  }) {
    const refundParams: Stripe.RefundCreateParams = {
      metadata: params.metadata || {},
    };

    if (params.paymentIntentId) {
      refundParams.payment_intent = params.paymentIntentId;
    } else if (params.chargeId) {
      refundParams.charge = params.chargeId;
    } else {
      throw new Error('Either paymentIntentId or chargeId is required');
    }

    if (params.amount) {
      refundParams.amount = Math.round(params.amount * 100); // Convert to cents
    }

    if (params.reason) {
      refundParams.reason = params.reason;
    }

    const refund = await this.stripe.refunds.create(refundParams);
    return refund;
  }

  /**
   * Attach a payment method to a customer
   */
  async attachPaymentMethod(paymentMethodId: string, customerId: string) {
    const paymentMethod = await this.stripe.paymentMethods.attach(
      paymentMethodId,
      { customer: customerId }
    );
    return paymentMethod;
  }

  /**
   * Attach a payment method to a customer using a token
   * This is an alias for compatibility with token-based flows
   */
  async attachPaymentMethodToCustomer(customerId: string, token: string) {
    // Create a source from the token first
    const source = await this.stripe.customers.createSource(customerId, {
      source: token
    });
    return source;
  }

  /**
   * Update customer's default payment method
   */
  async updateCustomerDefaultPaymentMethod(customerId: string, paymentMethodId: string) {
    const customer = await this.stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId
      }
    });
    return customer;
  }

  /**
   * Detach a payment method from a customer
   */
  async detachPaymentMethod(paymentMethodId: string) {
    const paymentMethod = await this.stripe.paymentMethods.detach(paymentMethodId);
    return paymentMethod;
  }

  /**
   * List customer's payment methods
   */
  async listPaymentMethods(customerId: string, type: Stripe.PaymentMethodListParams.Type = 'card') {
    const paymentMethods = await this.stripe.paymentMethods.list({
      customer: customerId,
      type,
    });
    return paymentMethods;
  }

  /**
   * Create a setup intent for saving payment methods
   */
  async createSetupIntent(customerId: string, metadata?: Record<string, string>) {
    const setupIntent = await this.stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
      metadata: metadata || {},
    });
    return setupIntent;
  }

  /**
   * Create a checkout session
   */
  async createCheckoutSession(params: {
    lineItems: Array<{
      price_data: {
        currency: string;
        product_data: {
          name: string;
          description?: string;
          images?: string[];
        };
        unit_amount: number;
      };
      quantity: number;
    }>;
    successUrl: string;
    cancelUrl: string;
    customer?: string;
    metadata?: Record<string, string>;
  }) {
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: params.lineItems,
      mode: 'payment',
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      customer: params.customer,
      metadata: params.metadata || {},
    });
    return session;
  }

  /**
   * Record a transaction in the database
   */
  async recordTransaction(params: {
    type: TransactionType;
    status: TransactionStatus;
    user: Types.ObjectId | string;
    order?: Types.ObjectId | string;
    amount: number;
    stripePaymentIntentId: string;
    stripeChargeId?: string;
    paymentMethod?: string;
    cardDetails?: {
      last4: string;
      brand: string;
      expMonth: number;
      expYear: number;
    };
    metadata?: Record<string, any>;
  }) {
    const transaction = await Transaction.create({
      transactionId: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: params.type,
      status: params.status,
      user: params.user,
      order: params.order,
      amount: params.amount,
      currency: 'usd',
      paymentMethod: params.paymentMethod || 'card',
      stripePaymentIntentId: params.stripePaymentIntentId,
      stripeChargeId: params.stripeChargeId,
      cardLast4: params.cardDetails?.last4,
      cardBrand: params.cardDetails?.brand,
      cardExpMonth: params.cardDetails?.expMonth,
      cardExpYear: params.cardDetails?.expYear,
      metadata: params.metadata,
    });

    return transaction;
  }

  /**
   * Update transaction status
   */
  async updateTransactionStatus(
    stripePaymentIntentId: string, 
    status: TransactionStatus,
    additionalData?: {
      stripeChargeId?: string;
      failureCode?: string;
      failureMessage?: string;
      processedAt?: Date;
    }
  ) {
    const transaction = await Transaction.findOneAndUpdate(
      { stripePaymentIntentId },
      {
        status,
        ...additionalData,
      },
      { new: true }
    );

    return transaction;
  }

  /**
   * Calculate platform fee (example: 5% of the total)
   */
  calculatePlatformFee(amount: number, percentage: number = 5): number {
    return Math.round(amount * (percentage / 100) * 100) / 100;
  }

  /**
   * Calculate Stripe fee (2.9% + $0.30)
   */
  calculateStripeFee(amount: number): number {
    return Math.round((amount * 0.029 + 0.30) * 100) / 100;
  }
}

export default new StripeService();
