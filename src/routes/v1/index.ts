import { Router } from 'express';
import authRoutes from './auth.routes.js';
import fileRoutes from './file.routes.js';
import otpRoutes from './otp.routes.js';
import productRoutes from './product.routes.js';
import orderRoutes from './order.routes.js';
import notificationRoutes from './notification.routes.js';
import addressRoutes from './address.routes.js';
import chatRoutes from './chat.routes.js';
import messageRoutes from './message.routes.js';
import bankAccountRoutes from './bankAccount.routes.js';
import socketTestRoutes from './socket-test.routes.js';
import userRoutes from './user.routes.js';
import contactRoutes from './contactus.routes.js'
// Import other route modules as they are created
// import paymentRoutes from './payment.routes.js';

const router = Router();

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *       description: JWT authorization token
 * 
 * security:
 *   - bearerAuth: []
 */

// API v1 routes
router.use('/auth', authRoutes);
router.use('/otp', otpRoutes);
router.use('/upload', fileRoutes);
router.use('/products', productRoutes);
router.use('/orders', orderRoutes);
router.use('/notifications', notificationRoutes);
router.use('/addresses', addressRoutes);
router.use('/chats', chatRoutes);
router.use('/messages', messageRoutes);
router.use('/bank-accounts', bankAccountRoutes);
router.use('/socket', socketTestRoutes);
router.use('/user', userRoutes);
router.use('/contact',contactRoutes)

// Protected routes (uncomment as controllers are implemented)
// router.use('/payments', paymentRoutes);



// Health check for API v1
router.get('/health', (_req, res) => {
  res.json({
    status: 'success',
    message: 'API v1 is healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    endpoints: {
      auth: {
        register: 'POST /api/v1/auth/register',
        login: 'POST /api/v1/auth/login',
        logout: 'POST /api/v1/auth/logout',
        refresh: 'POST /api/v1/auth/refresh',
        forgotPassword: 'POST /api/v1/auth/forgot-password',
        resetPassword: 'POST /api/v1/auth/reset-password',
        googleAuth: 'GET /api/v1/auth/google',
        googleCallback: 'GET /api/v1/auth/google/callback',
        completeProfile: 'POST /api/v1/auth/complete-profile',
        health: 'GET /api/v1/auth/health',
      },
      otp: {
        create: 'POST /api/v1/otp/create',
        verify: 'POST /api/v1/otp/verify',
        resend: 'POST /api/v1/otp/resend',
        health: 'GET /api/v1/otp/health',
      },
      files: {
        upload: 'POST /api/v1/files/upload',
        uploadMultiple: 'POST /api/v1/files/upload-multiple',
        uploadImage: 'POST /api/v1/files/upload-image',
        uploadVideo: 'POST /api/v1/files/upload-video',
        uploadAvatar: 'POST /api/v1/files/upload-avatar',
        list: 'GET /api/v1/files',
        myFiles: 'GET /api/v1/files/my-files',
        getFile: 'GET /api/v1/files/:id',
        deleteFile: 'DELETE /api/v1/files/:id',
      },
      products: {
        list: 'GET /api/v1/products',
        featured: 'GET /api/v1/products/featured',
        search: 'GET /api/v1/products/search',
        sellerProducts: 'GET /api/v1/products/seller',
        get: 'GET /api/v1/products/:id',
        create: 'POST /api/v1/products',
        update: 'PATCH /api/v1/products/:id',
        delete: 'DELETE /api/v1/products/:id',
        toggleStatus: 'PATCH /api/v1/products/:id/status',
        updateStock: 'PATCH /api/v1/products/:id/stock',
      },
      orders: {
        list: 'GET /api/v1/orders',
        stats: 'GET /api/v1/orders/stats',
        create: 'POST /api/v1/orders',
        get: 'GET /api/v1/orders/:id',
        getByNumber: 'GET /api/v1/orders/number/:orderNumber',
        tracking: 'GET /api/v1/orders/:id/tracking',
        update: 'PUT /api/v1/orders/:id',
        updateStatus: 'PATCH /api/v1/orders/:id/status',
        assignDriver: 'PATCH /api/v1/orders/:id/assign-driver',
        deliver: 'PATCH /api/v1/orders/:id/deliver',
        cancel: 'PATCH /api/v1/orders/:id/cancel',
        refund: 'POST /api/v1/orders/:id/refund',
        customerReview: 'POST /api/v1/orders/:id/review/customer',
        driverReview: 'POST /api/v1/orders/:id/review/driver',
        sellerOrders: 'GET /api/v1/orders/seller/orders',
        driverDeliveries: 'GET /api/v1/orders/driver/deliveries',
        myOrders: 'GET /api/v1/orders/my-orders',
      },
      notifications: {
        list: 'GET /api/v1/notifications',
        stats: 'GET /api/v1/notifications/stats',
        unreadCount: 'GET /api/v1/notifications/unread-count',
        get: 'GET /api/v1/notifications/:id',
        markAsRead: 'PATCH /api/v1/notifications/:id/read',
        markAsUnread: 'PATCH /api/v1/notifications/:id/unread',
        markAllAsRead: 'PATCH /api/v1/notifications/mark-all-read',
        delete: 'DELETE /api/v1/notifications/:id',
        deleteAll: 'DELETE /api/v1/notifications',
        create: 'POST /api/v1/notifications',
        sendBulk: 'POST /api/v1/notifications/bulk',
      },
      addresses: {
        list: 'GET /api/v1/addresses',
        create: 'POST /api/v1/addresses',
        get: 'GET /api/v1/addresses/:id',
        update: 'PATCH /api/v1/addresses/:id',
        delete: 'DELETE /api/v1/addresses/:id',
        setDefault: 'PATCH /api/v1/addresses/:id/set-default',
        getDefault: 'GET /api/v1/addresses/default',
        search: 'GET /api/v1/addresses/search',
        bulk: 'PATCH /api/v1/addresses/bulk',
        statistics: 'GET /api/v1/addresses/statistics',
        health: 'GET /api/v1/addresses/health',
      },
      chats: {
        create: 'POST /api/v1/chats',
        list: 'GET /api/v1/chats',
        get: 'GET /api/v1/chats/single',
        delete: 'DELETE /api/v1/chats/:id',
      },
      messages: {
        send: 'POST /api/v1/messages/send',
        list: 'GET /api/v1/messages',
        updateStatus: 'PATCH /api/v1/messages/:id/status',
        markAllAsRead: 'POST /api/v1/messages/mark-all-read',
      },
      bankAccounts: {
        create: 'POST /api/v1/bank-accounts',
        list: 'GET /api/v1/bank-accounts',
        get: 'GET /api/v1/bank-accounts/:id',
        update: 'PATCH /api/v1/bank-accounts/:id',
        delete: 'DELETE /api/v1/bank-accounts/:id',
        setDefault: 'PATCH /api/v1/bank-accounts/:id/set-default',
        getDefault: 'GET /api/v1/bank-accounts/default',
      },
      user: {
        profile: 'GET /api/v1/user/profile',
        updateProfile: 'PUT /api/v1/user/profile',
      },
      contact: {
        create: 'POST /api/v1/contact',
      },
    },
    documentation: '/api-docs',
  });
});

export default router;