import stripe from '../config/stripe.js';

class StripeService {
  static async createCustomer({ email, name }: { email: string; name: string }) {
    try {
      const customer = await stripe.customers.create({
        email,
        name,
      });
      return customer;
    } catch (error: any) {
      throw new Error(`Error creating Stripe customer: ${error.message}`);
    }
  }

  static async createCardToken({
    cardNumber,
    expMonth,
    expYear,
    cvc,
  }: {
    cardNumber: string;
    expMonth: number;
    expYear: number;
    cvc: string;
  }) {
    try {
      const token = await stripe.tokens.create({
        card: {
          number: cardNumber,
          exp_month: expMonth,
          exp_year: expYear,
          cvc,
        },
      });
      return token;
    } catch (error: any) {
      throw new Error(`Error creating card token: ${error.message}`);
    }
  }

  static async createPaymentMethodFromToken(tokenId: string) {
    try {
      const paymentMethod = await stripe.paymentMethods.create({
        type: 'card',
        card: { token: tokenId },
      });
      return paymentMethod;
    } catch (error: any) {
      throw new Error(`Error creating payment method: ${error.message}`);
    }
  }

  static async attachPaymentMethodToCustomer(customerId: string, tokenId: string) {
    try {
      // First create a payment method from the token
      const paymentMethod = await this.createPaymentMethodFromToken(tokenId);
      
      // Then attach it to the customer
      await stripe.paymentMethods.attach(paymentMethod.id, {
        customer: customerId,
      });

      return paymentMethod;
    } catch (error: any) {
      throw new Error(`Error attaching payment method to customer: ${error.message}`);
    }
  }

  static async updateCustomerDefaultPaymentMethod(customerId: string, paymentMethodId: string) {
    try {
      const customer = await stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });
      return customer;
    } catch (error: any) {
      throw new Error(`Error updating customer default payment method: ${error.message}`);
    }
  }

  static async detachPaymentMethod(paymentMethodId: string) {
    try {
      const paymentMethod = await stripe.paymentMethods.detach(paymentMethodId);
      return paymentMethod;
    } catch (error: any) {
      throw new Error(`Error detaching payment method: ${error.message}`);
    }
  }

  static async listCustomerPaymentMethods(customerId: string, type: 'card' | 'bank_account' = 'card') {
    try {
      const paymentMethods = await stripe.paymentMethods.list({
        customer: customerId,
        type,
      });
      return paymentMethods;
    } catch (error: any) {
      throw new Error(`Error listing customer payment methods: ${error.message}`);
    }
  }

  static async createPaymentIntent(
    amount: number,
    currency: string,
    customerId: string,
    paymentMethodId: string
  ) {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(parseFloat(amount.toString()) * 100),
        currency,
        customer: customerId,
        payment_method: paymentMethodId,
        confirm: true,
        off_session: true,
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'never',
        },
      });
      return paymentIntent;
    } catch (error: any) {
      throw new Error(`Error creating payment intent: ${error.message}`);
    }
  }

  static async retrievePaymentIntent(paymentIntentId: string) {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      return paymentIntent;
    } catch (error: any) {
      throw new Error(`Error retrieving payment intent: ${error.message}`);
    }
  }

  static async createBankAccountToken({
    country,
    currency,
    accountNumber,
    accountHolderName,
    accountHolderType,
    routingNumber,
  }: {
    country: string;
    currency: string;
    accountNumber: string;
    accountHolderName: string;
    accountHolderType: 'individual' | 'company';
    routingNumber: string;
  }) {
    try {
      const token = await stripe.tokens.create({
        bank_account: {
          country,
          currency,
          account_number: accountNumber,
          account_holder_name: accountHolderName,
          account_holder_type: accountHolderType,
          routing_number: routingNumber,
        },
      });
      return token;
    } catch (error: any) {
      throw new Error(`Error creating bank account token: ${error.message}`);
    }
  }

  static async attachPaymentSource(customerId: string, sourceToken: string) {
    try {
      const source = await stripe.customers.createSource(customerId, {
        source: sourceToken,
      });
      return source;
    } catch (error: any) {
      throw new Error(`Error attaching payment source: ${error.message}`);
    }
  }

  static async listCustomerPaymentSources(customerId: string, type: 'card' | 'bank_account' = 'card') {
    try {
      const sources = await stripe.customers.listSources(customerId, {
        object: type,
      });
      return sources;
    } catch (error: any) {
      throw new Error(`Error listing customer payment sources: ${error.message}`);
    }
  }

  static async detachPaymentSource(pmId: string) {
    try {
      const paymentMethod = await stripe.paymentMethods.detach(pmId);
      return paymentMethod;
    } catch (error: any) {
      throw new Error(`Error detaching payment source: ${error.message}`);
    }
  }
}

export default StripeService;