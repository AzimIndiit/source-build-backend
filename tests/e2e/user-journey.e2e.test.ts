import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import app from '../../src/server';
import { User } from '../../src/models/user.model';
import { Product } from '../../src/models/product.model';
import { Order } from '../../src/models/order.model';
import { UserRole } from '../../src/types/models/user.types';

describe('E2E: Complete User Journey', () => {
  let mongoServer: MongoMemoryServer;
  let buyerToken: string;
  let sellerToken: string;
  let buyerId: string;
  let sellerId: string;
  let productId: string;
  let orderId: string;

  beforeAll(async () => {
    // Setup in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  describe('User Registration and Verification Flow', () => {
    it('should complete buyer registration and verification', async () => {
      // Step 1: Register as buyer
      const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'buyer@example.com',
          password: 'BuyerPass123!',
          name: 'Test Buyer',
          role: UserRole.BUYER,
          phone: '+1234567890'
        })
        .expect(201);

      expect(registerResponse.body.success).toBe(true);
      expect(registerResponse.body.data.user.email).toBe('buyer@example.com');
      
      buyerId = registerResponse.body.data.user._id;

      // Step 2: Simulate email verification (in real scenario, user clicks link)
      const buyer = await User.findById(buyerId);
      buyer!.isVerified = true;
      await buyer!.save();

      // Step 3: Login with verified account
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'buyer@example.com',
          password: 'BuyerPass123!'
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
      buyerToken = loginResponse.body.data.accessToken;

      // Step 4: Update profile
      const profileResponse = await request(app)
        .put('/api/v1/users/profile')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          address: {
            street: '123 Main St',
            city: 'New York',
            state: 'NY',
            zipCode: '10001',
            country: 'USA'
          }
        })
        .expect(200);

      expect(profileResponse.body.success).toBe(true);
    });

    it('should complete seller registration and verification', async () => {
      // Step 1: Register as seller
      const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'seller@example.com',
          password: 'SellerPass123!',
          name: 'Test Seller',
          role: UserRole.SELLER,
          phone: '+1234567891',
          businessName: 'Test Store',
          businessDescription: 'We sell quality products'
        })
        .expect(201);

      expect(registerResponse.body.success).toBe(true);
      sellerId = registerResponse.body.data.user._id;

      // Step 2: Verify email
      const seller = await User.findById(sellerId);
      seller!.isVerified = true;
      await seller!.save();

      // Step 3: Login
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'seller@example.com',
          password: 'SellerPass123!'
        })
        .expect(200);

      sellerToken = loginResponse.body.data.accessToken;

      // Step 4: Complete seller onboarding
      const onboardingResponse = await request(app)
        .post('/api/v1/sellers/onboarding')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          bankAccount: {
            accountNumber: '1234567890',
            routingNumber: '987654321',
            accountName: 'Test Store LLC'
          },
          taxId: 'TAX123456',
          businessAddress: {
            street: '456 Business Ave',
            city: 'Los Angeles',
            state: 'CA',
            zipCode: '90001',
            country: 'USA'
          }
        })
        .expect(200);

      expect(onboardingResponse.body.success).toBe(true);
    });
  });

  describe('Product Management Flow', () => {
    it('should allow seller to create and manage products', async () => {
      // Step 1: Create a product
      const createProductResponse = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          title: 'Test Product',
          description: 'High quality test product',
          price: 99.99,
          category: 'Electronics',
          subcategory: 'Accessories',
          stock: 100,
          images: [
            'https://example.com/image1.jpg',
            'https://example.com/image2.jpg'
          ],
          specifications: {
            brand: 'TestBrand',
            model: 'TB-001',
            weight: '500g',
            dimensions: '10x10x5 cm'
          },
          tags: ['electronics', 'accessories', 'new'],
          shippingInfo: {
            weight: 0.5,
            dimensions: { length: 10, width: 10, height: 5 },
            freeShipping: true,
            estimatedDelivery: '3-5 business days'
          }
        })
        .expect(201);

      expect(createProductResponse.body.success).toBe(true);
      productId = createProductResponse.body.data._id;

      // Step 2: Update product
      const updateProductResponse = await request(app)
        .put(`/api/v1/products/${productId}`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          price: 89.99,
          stock: 150
        })
        .expect(200);

      expect(updateProductResponse.body.success).toBe(true);
      expect(updateProductResponse.body.data.price).toBe(89.99);

      // Step 3: Get seller's products
      const getProductsResponse = await request(app)
        .get('/api/v1/products/my-products')
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(200);

      expect(getProductsResponse.body.success).toBe(true);
      expect(getProductsResponse.body.data.length).toBeGreaterThan(0);
    });

    it('should allow buyers to browse and search products', async () => {
      // Step 1: Browse all products
      const browseResponse = await request(app)
        .get('/api/v1/products')
        .expect(200);

      expect(browseResponse.body.success).toBe(true);
      expect(browseResponse.body.data.products.length).toBeGreaterThan(0);

      // Step 2: Search products
      const searchResponse = await request(app)
        .get('/api/v1/products/search')
        .query({ q: 'Test Product' })
        .expect(200);

      expect(searchResponse.body.success).toBe(true);
      expect(searchResponse.body.data.results.length).toBeGreaterThan(0);

      // Step 3: Filter by category
      const filterResponse = await request(app)
        .get('/api/v1/products')
        .query({ 
          category: 'Electronics',
          minPrice: 50,
          maxPrice: 100
        })
        .expect(200);

      expect(filterResponse.body.success).toBe(true);

      // Step 4: Get product details
      const detailsResponse = await request(app)
        .get(`/api/v1/products/${productId}`)
        .expect(200);

      expect(detailsResponse.body.success).toBe(true);
      expect(detailsResponse.body.data._id).toBe(productId);
    });
  });

  describe('Shopping Cart and Checkout Flow', () => {
    let cartId: string;

    it('should complete shopping cart operations', async () => {
      // Step 1: Add product to cart
      const addToCartResponse = await request(app)
        .post('/api/v1/cart/add')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          productId: productId,
          quantity: 2
        })
        .expect(200);

      expect(addToCartResponse.body.success).toBe(true);
      cartId = addToCartResponse.body.data._id;

      // Step 2: Update cart item quantity
      const updateCartResponse = await request(app)
        .put('/api/v1/cart/update')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          productId: productId,
          quantity: 3
        })
        .expect(200);

      expect(updateCartResponse.body.success).toBe(true);
      expect(updateCartResponse.body.data.items[0].quantity).toBe(3);

      // Step 3: Get cart details
      const getCartResponse = await request(app)
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      expect(getCartResponse.body.success).toBe(true);
      expect(getCartResponse.body.data.items.length).toBe(1);
      expect(getCartResponse.body.data.totalAmount).toBe(89.99 * 3);
    });

    it('should complete checkout and create order', async () => {
      // Step 1: Initiate checkout
      const checkoutResponse = await request(app)
        .post('/api/v1/checkout/initiate')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          shippingAddress: {
            street: '123 Main St',
            city: 'New York',
            state: 'NY',
            zipCode: '10001',
            country: 'USA'
          },
          paymentMethod: 'card'
        })
        .expect(200);

      expect(checkoutResponse.body.success).toBe(true);
      const checkoutSessionId = checkoutResponse.body.data.sessionId;

      // Step 2: Process payment (simulate)
      const paymentResponse = await request(app)
        .post('/api/v1/checkout/process-payment')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          sessionId: checkoutSessionId,
          paymentDetails: {
            cardNumber: '4242424242424242',
            expiryMonth: 12,
            expiryYear: 2025,
            cvv: '123'
          }
        })
        .expect(200);

      expect(paymentResponse.body.success).toBe(true);
      orderId = paymentResponse.body.data.orderId;

      // Step 3: Confirm order
      const confirmResponse = await request(app)
        .post('/api/v1/orders/confirm')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          orderId: orderId
        })
        .expect(200);

      expect(confirmResponse.body.success).toBe(true);
      expect(confirmResponse.body.data.status).toBe('confirmed');
    });
  });

  describe('Order Management Flow', () => {
    it('should allow buyer to track order', async () => {
      // Step 1: Get order details
      const orderDetailsResponse = await request(app)
        .get(`/api/v1/orders/${orderId}`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      expect(orderDetailsResponse.body.success).toBe(true);
      expect(orderDetailsResponse.body.data._id).toBe(orderId);

      // Step 2: Get order history
      const orderHistoryResponse = await request(app)
        .get('/api/v1/orders/my-orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      expect(orderHistoryResponse.body.success).toBe(true);
      expect(orderHistoryResponse.body.data.orders.length).toBeGreaterThan(0);

      // Step 3: Track shipping
      const trackingResponse = await request(app)
        .get(`/api/v1/orders/${orderId}/tracking`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      expect(trackingResponse.body.success).toBe(true);
    });

    it('should allow seller to manage orders', async () => {
      // Step 1: Get seller orders
      const sellerOrdersResponse = await request(app)
        .get('/api/v1/sellers/orders')
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(200);

      expect(sellerOrdersResponse.body.success).toBe(true);
      expect(sellerOrdersResponse.body.data.orders.length).toBeGreaterThan(0);

      // Step 2: Update order status
      const updateStatusResponse = await request(app)
        .put(`/api/v1/sellers/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          status: 'processing'
        })
        .expect(200);

      expect(updateStatusResponse.body.success).toBe(true);

      // Step 3: Add tracking information
      const addTrackingResponse = await request(app)
        .post(`/api/v1/sellers/orders/${orderId}/tracking`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          carrier: 'FedEx',
          trackingNumber: 'FX123456789',
          estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
        })
        .expect(200);

      expect(addTrackingResponse.body.success).toBe(true);
    });
  });

  describe('Review and Rating Flow', () => {
    it('should allow buyer to review purchased products', async () => {
      // Simulate order completion
      await Order.findByIdAndUpdate(orderId, { status: 'delivered' });

      // Step 1: Add product review
      const reviewResponse = await request(app)
        .post(`/api/v1/products/${productId}/reviews`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          rating: 5,
          title: 'Excellent Product!',
          comment: 'Very satisfied with the quality and fast shipping.',
          images: ['https://example.com/review1.jpg']
        })
        .expect(201);

      expect(reviewResponse.body.success).toBe(true);

      // Step 2: Get product reviews
      const getReviewsResponse = await request(app)
        .get(`/api/v1/products/${productId}/reviews`)
        .expect(200);

      expect(getReviewsResponse.body.success).toBe(true);
      expect(getReviewsResponse.body.data.reviews.length).toBeGreaterThan(0);
      expect(getReviewsResponse.body.data.averageRating).toBe(5);

      // Step 3: Rate seller
      const rateSellerResponse = await request(app)
        .post(`/api/v1/sellers/${sellerId}/ratings`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          rating: 5,
          comment: 'Great seller, fast response and shipping!'
        })
        .expect(201);

      expect(rateSellerResponse.body.success).toBe(true);
    });
  });

  describe('Customer Support Flow', () => {
    let ticketId: string;

    it('should handle customer support tickets', async () => {
      // Step 1: Create support ticket
      const createTicketResponse = await request(app)
        .post('/api/v1/support/tickets')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          subject: 'Issue with order',
          category: 'order',
          priority: 'medium',
          description: 'Product arrived with minor damage',
          orderId: orderId,
          attachments: ['https://example.com/damage-photo.jpg']
        })
        .expect(201);

      expect(createTicketResponse.body.success).toBe(true);
      ticketId = createTicketResponse.body.data._id;

      // Step 2: Add message to ticket
      const addMessageResponse = await request(app)
        .post(`/api/v1/support/tickets/${ticketId}/messages`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          message: 'Here is additional information about the damage'
        })
        .expect(200);

      expect(addMessageResponse.body.success).toBe(true);

      // Step 3: Get ticket status
      const getTicketResponse = await request(app)
        .get(`/api/v1/support/tickets/${ticketId}`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      expect(getTicketResponse.body.success).toBe(true);
      expect(getTicketResponse.body.data._id).toBe(ticketId);
    });
  });

  describe('Returns and Refunds Flow', () => {
    let returnId: string;

    it('should process return request', async () => {
      // Step 1: Initiate return
      const initiateReturnResponse = await request(app)
        .post('/api/v1/returns')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          orderId: orderId,
          productId: productId,
          reason: 'damaged',
          description: 'Product arrived with damage',
          requestType: 'refund',
          images: ['https://example.com/damage1.jpg']
        })
        .expect(201);

      expect(initiateReturnResponse.body.success).toBe(true);
      returnId = initiateReturnResponse.body.data._id;

      // Step 2: Seller approves return
      const approveReturnResponse = await request(app)
        .put(`/api/v1/sellers/returns/${returnId}/approve`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          returnShippingLabel: 'https://example.com/return-label.pdf',
          instructions: 'Please pack the item securely'
        })
        .expect(200);

      expect(approveReturnResponse.body.success).toBe(true);

      // Step 3: Buyer ships return
      const shipReturnResponse = await request(app)
        .post(`/api/v1/returns/${returnId}/ship`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          trackingNumber: 'RT987654321',
          carrier: 'UPS'
        })
        .expect(200);

      expect(shipReturnResponse.body.success).toBe(true);

      // Step 4: Seller confirms receipt and processes refund
      const confirmReceiptResponse = await request(app)
        .post(`/api/v1/sellers/returns/${returnId}/confirm-receipt`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          condition: 'as_described',
          refundAmount: 89.99 * 3
        })
        .expect(200);

      expect(confirmReceiptResponse.body.success).toBe(true);
      expect(confirmReceiptResponse.body.data.status).toBe('refunded');
    });
  });

  describe('Analytics and Reporting', () => {
    it('should provide seller analytics', async () => {
      // Step 1: Get sales analytics
      const salesAnalyticsResponse = await request(app)
        .get('/api/v1/sellers/analytics/sales')
        .set('Authorization', `Bearer ${sellerToken}`)
        .query({
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          endDate: new Date()
        })
        .expect(200);

      expect(salesAnalyticsResponse.body.success).toBe(true);
      expect(salesAnalyticsResponse.body.data).toHaveProperty('totalSales');
      expect(salesAnalyticsResponse.body.data).toHaveProperty('totalOrders');
      expect(salesAnalyticsResponse.body.data).toHaveProperty('averageOrderValue');

      // Step 2: Get product performance
      const productPerformanceResponse = await request(app)
        .get('/api/v1/sellers/analytics/products')
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(200);

      expect(productPerformanceResponse.body.success).toBe(true);
      expect(productPerformanceResponse.body.data.products).toBeDefined();

      // Step 3: Get customer insights
      const customerInsightsResponse = await request(app)
        .get('/api/v1/sellers/analytics/customers')
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(200);

      expect(customerInsightsResponse.body.success).toBe(true);
    });

    it('should provide buyer purchase history', async () => {
      const purchaseHistoryResponse = await request(app)
        .get('/api/v1/users/purchase-history')
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      expect(purchaseHistoryResponse.body.success).toBe(true);
      expect(purchaseHistoryResponse.body.data.orders.length).toBeGreaterThan(0);
      expect(purchaseHistoryResponse.body.data.totalSpent).toBeGreaterThan(0);
    });
  });

  describe('Account Management', () => {
    it('should handle account settings and preferences', async () => {
      // Step 1: Update notification preferences
      const notificationResponse = await request(app)
        .put('/api/v1/users/preferences/notifications')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          emailNotifications: {
            orders: true,
            promotions: false,
            newsletters: false
          },
          pushNotifications: {
            orders: true,
            messages: true,
            promotions: false
          }
        })
        .expect(200);

      expect(notificationResponse.body.success).toBe(true);

      // Step 2: Update privacy settings
      const privacyResponse = await request(app)
        .put('/api/v1/users/preferences/privacy')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          profileVisibility: 'private',
          showPurchaseHistory: false,
          allowMessages: true
        })
        .expect(200);

      expect(privacyResponse.body.success).toBe(true);

      // Step 3: Add payment method
      const paymentMethodResponse = await request(app)
        .post('/api/v1/users/payment-methods')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          type: 'card',
          cardNumber: '5555555555554444',
          expiryMonth: 12,
          expiryYear: 2025,
          cvv: '123',
          isDefault: true
        })
        .expect(201);

      expect(paymentMethodResponse.body.success).toBe(true);

      // Step 4: Request account data export (GDPR compliance)
      const dataExportResponse = await request(app)
        .post('/api/v1/users/data-export')
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      expect(dataExportResponse.body.success).toBe(true);
      expect(dataExportResponse.body.message).toContain('export');
    });

    it('should handle account deactivation', async () => {
      // Create a test user for deactivation
      const testUserResponse = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'deactivate@example.com',
          password: 'TempPass123!',
          name: 'Temp User',
          role: UserRole.BUYER
        })
        .expect(201);

      const tempToken = testUserResponse.body.data.accessToken;

      // Deactivate account
      const deactivateResponse = await request(app)
        .post('/api/v1/users/deactivate')
        .set('Authorization', `Bearer ${tempToken}`)
        .send({
          reason: 'No longer needed',
          feedback: 'Good service overall'
        })
        .expect(200);

      expect(deactivateResponse.body.success).toBe(true);

      // Try to login with deactivated account
      const loginAttempt = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'deactivate@example.com',
          password: 'TempPass123!'
        })
        .expect(403);

      expect(loginAttempt.body.error.message).toContain('deactivated');
    });
  });
});