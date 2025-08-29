/**
 * Application constants and enumerations
 * Centralized location for all constant values used throughout the application
 */

// =============================================================================
// HTTP STATUS CODES
// =============================================================================
export const httpStatus = {
  // 1xx Informational responses
  CONTINUE: 100,
  SWITCHING_PROTOCOLS: 101,
  PROCESSING: 102,

  // 2xx Success
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  RESET_CONTENT: 205,
  PARTIAL_CONTENT: 206,

  // 3xx Redirection
  MULTIPLE_CHOICES: 300,
  MOVED_PERMANENTLY: 301,
  FOUND: 302,
  SEE_OTHER: 303,
  NOT_MODIFIED: 304,
  TEMPORARY_REDIRECT: 307,
  PERMANENT_REDIRECT: 308,

  // 4xx Client errors
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  PAYMENT_REQUIRED: 402,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  NOT_ACCEPTABLE: 406,
  PROXY_AUTHENTICATION_REQUIRED: 407,
  REQUEST_TIMEOUT: 408,
  CONFLICT: 409,
  GONE: 410,
  LENGTH_REQUIRED: 411,
  PRECONDITION_FAILED: 412,
  PAYLOAD_TOO_LARGE: 413,
  URI_TOO_LONG: 414,
  UNSUPPORTED_MEDIA_TYPE: 415,
  RANGE_NOT_SATISFIABLE: 416,
  EXPECTATION_FAILED: 417,
  IM_A_TEAPOT: 418,
  MISDIRECTED_REQUEST: 421,
  UNPROCESSABLE_ENTITY: 422,
  LOCKED: 423,
  FAILED_DEPENDENCY: 424,
  TOO_EARLY: 425,
  UPGRADE_REQUIRED: 426,
  PRECONDITION_REQUIRED: 428,
  TOO_MANY_REQUESTS: 429,
  REQUEST_HEADER_FIELDS_TOO_LARGE: 431,
  UNAVAILABLE_FOR_LEGAL_REASONS: 451,

  // 5xx Server errors
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
  HTTP_VERSION_NOT_SUPPORTED: 505,
  VARIANT_ALSO_NEGOTIATES: 506,
  INSUFFICIENT_STORAGE: 507,
  LOOP_DETECTED: 508,
  BANDWIDTH_LIMIT_EXCEEDED: 509,
  NOT_EXTENDED: 510,
  NETWORK_AUTHENTICATION_REQUIRED: 511,
} as const;

// =============================================================================
// USER ROLES & PERMISSIONS
// =============================================================================
export const USER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MANAGER: 'manager',
  MODERATOR: 'moderator',
  USER: 'user',
  GUEST: 'guest',
} as const;

export const USER_PERMISSIONS = {
  // User management
  CREATE_USER: 'create:user',
  READ_USER: 'read:user',
  UPDATE_USER: 'update:user',
  DELETE_USER: 'delete:user',
  LIST_USERS: 'list:users',

  // Product management
  CREATE_PRODUCT: 'create:product',
  READ_PRODUCT: 'read:product',
  UPDATE_PRODUCT: 'update:product',
  DELETE_PRODUCT: 'delete:product',
  LIST_PRODUCTS: 'list:products',
  MANAGE_INVENTORY: 'manage:inventory',

  // Order management
  CREATE_ORDER: 'create:order',
  READ_ORDER: 'read:order',
  UPDATE_ORDER: 'update:order',
  DELETE_ORDER: 'delete:order',
  LIST_ORDERS: 'list:orders',
  PROCESS_ORDERS: 'process:orders',

  // Payment management
  PROCESS_PAYMENTS: 'process:payments',
  REFUND_PAYMENTS: 'refund:payments',
  VIEW_FINANCIAL_DATA: 'view:financial_data',

  // System administration
  MANAGE_SYSTEM: 'manage:system',
  VIEW_ANALYTICS: 'view:analytics',
  MANAGE_SETTINGS: 'manage:settings',
  VIEW_LOGS: 'view:logs',
  BACKUP_DATA: 'backup:data',
} as const;

// =============================================================================
// ORDER STATUS
// =============================================================================
export const ORDER_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PROCESSING: 'processing',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
  RETURNED: 'returned',
} as const;

// =============================================================================
// PAYMENT STATUS
// =============================================================================
export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
  PARTIALLY_REFUNDED: 'partially_refunded',
} as const;

// =============================================================================
// PAYMENT METHODS
// =============================================================================
export const PAYMENT_METHODS = {
  CREDIT_CARD: 'credit_card',
  DEBIT_CARD: 'debit_card',
  PAYPAL: 'paypal',
  STRIPE: 'stripe',
  BANK_TRANSFER: 'bank_transfer',
  CASH_ON_DELIVERY: 'cash_on_delivery',
  DIGITAL_WALLET: 'digital_wallet',
} as const;

// =============================================================================
// PRODUCT CATEGORIES
// =============================================================================
export const PRODUCT_CATEGORIES = {
  ELECTRONICS: 'electronics',
  CLOTHING: 'clothing',
  BOOKS: 'books',
  HOME_GARDEN: 'home_garden',
  SPORTS: 'sports',
  TOYS: 'toys',
  AUTOMOTIVE: 'automotive',
  HEALTH_BEAUTY: 'health_beauty',
  FOOD_BEVERAGES: 'food_beverages',
  OTHER: 'other',
} as const;

// =============================================================================
// FILE UPLOAD CONSTANTS
// =============================================================================
export const FILE_UPLOAD = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'],
  ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  ALLOWED_VIDEO_TYPES: ['video/mp4', 'video/avi', 'video/mov', 'video/wmv'],
  UPLOAD_PATHS: {
    AVATARS: 'uploads/avatars/',
    PRODUCTS: 'uploads/products/',
    DOCUMENTS: 'uploads/documents/',
    TEMP: 'uploads/temp/',
  },
} as const;

// =============================================================================
// EMAIL TEMPLATES
// =============================================================================
export const EMAIL_TEMPLATES = {
  WELCOME: 'welcome',
  EMAIL_VERIFICATION: 'email_verification',
  PASSWORD_RESET: 'password_reset',
  ORDER_CONFIRMATION: 'order_confirmation',
  ORDER_SHIPPED: 'order_shipped',
  ORDER_DELIVERED: 'order_delivered',
  PAYMENT_CONFIRMATION: 'payment_confirmation',
  ACCOUNT_SUSPENDED: 'account_suspended',
  NEWSLETTER: 'newsletter',
} as const;

// =============================================================================
// CACHE KEYS
// =============================================================================
export const CACHE_KEYS = {
  USER_PROFILE: (userId: string) => `user:profile:${userId}`,
  USER_PERMISSIONS: (userId: string) => `user:permissions:${userId}`,
  PRODUCT_DETAILS: (productId: string) => `product:details:${productId}`,
  PRODUCT_LIST: (page: number, limit: number) => `products:list:${page}:${limit}`,
  ORDER_DETAILS: (orderId: string) => `order:details:${orderId}`,
  SYSTEM_SETTINGS: 'system:settings',
  FEATURED_PRODUCTS: 'products:featured',
  CATEGORIES: 'categories:all',
} as const;

// =============================================================================
// REGEX PATTERNS
// =============================================================================
export const REGEX_PATTERNS = {
  EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  PHONE: /^\+?[\d\s\-\(\)]{10,}$/,
  USERNAME: /^[a-zA-Z0-9_]{3,20}$/,
  SLUG: /^[a-z0-9-]+$/,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  MONGODB_OBJECTID: /^[0-9a-fA-F]{24}$/,
  URL: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
  IP_ADDRESS: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
} as const;

// =============================================================================
// PAGINATION DEFAULTS
// =============================================================================
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
  DEFAULT_SORT: 'createdAt',
  DEFAULT_ORDER: 'desc' as const,
} as const;

// =============================================================================
// DATE FORMATS
// =============================================================================
export const DATE_FORMATS = {
  ISO_DATE: 'YYYY-MM-DD',
  ISO_DATETIME: 'YYYY-MM-DDTHH:mm:ssZ',
  DISPLAY_DATE: 'MMM DD, YYYY',
  DISPLAY_DATETIME: 'MMM DD, YYYY HH:mm',
  FILE_TIMESTAMP: 'YYYYMMDD_HHmmss',
} as const;

// =============================================================================
// TIME CONSTANTS
// =============================================================================
export const TIME = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
  MONTH: 30 * 24 * 60 * 60 * 1000,
  YEAR: 365 * 24 * 60 * 60 * 1000,
} as const;

// =============================================================================
// API RESPONSE MESSAGES
// =============================================================================
export const MESSAGES = {
  // Success messages
  SUCCESS: 'Operation completed successfully',
  CREATED: 'Resource created successfully',
  UPDATED: 'Resource updated successfully',
  DELETED: 'Resource deleted successfully',
  
  // Authentication messages
  LOGIN_SUCCESS: 'Login successful',
  LOGOUT_SUCCESS: 'Logout successful',
  REGISTRATION_SUCCESS: 'Registration successful',
  EMAIL_VERIFIED: 'Email verified successfully',
  PASSWORD_RESET_SUCCESS: 'Password reset successful',
  
  // Error messages
  UNAUTHORIZED: 'Unauthorized access',
  FORBIDDEN: 'Access forbidden',
  NOT_FOUND: 'Resource not found',
  BAD_REQUEST: 'Invalid request data',
  VALIDATION_ERROR: 'Validation failed',
  INTERNAL_ERROR: 'Internal server error',
  
  // User messages
  USER_NOT_FOUND: 'User not found',
  USER_ALREADY_EXISTS: 'User already exists',
  INVALID_CREDENTIALS: 'Invalid credentials',
  ACCOUNT_DISABLED: 'Account is disabled',
  EMAIL_NOT_VERIFIED: 'Email not verified',
  
  // Product messages
  PRODUCT_NOT_FOUND: 'Product not found',
  OUT_OF_STOCK: 'Product is out of stock',
  INSUFFICIENT_STOCK: 'Insufficient stock available',
  
  // Order messages
  ORDER_NOT_FOUND: 'Order not found',
  ORDER_CANNOT_BE_CANCELLED: 'Order cannot be cancelled',
  PAYMENT_FAILED: 'Payment processing failed',
} as const;

// =============================================================================
// VALIDATION CONSTRAINTS
// =============================================================================
export const VALIDATION = {
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 128,
  USERNAME_MIN_LENGTH: 3,
  USERNAME_MAX_LENGTH: 20,
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 50,
  DESCRIPTION_MAX_LENGTH: 1000,
  TITLE_MAX_LENGTH: 200,
  EMAIL_MAX_LENGTH: 254,
  PHONE_MAX_LENGTH: 20,
} as const;

// =============================================================================
// ENVIRONMENT TYPES
// =============================================================================
export const ENVIRONMENTS = {
  DEVELOPMENT: 'development',
  PRODUCTION: 'production',
  TEST: 'test',
  STAGING: 'staging',
} as const;

// =============================================================================
// TYPE EXPORTS
// =============================================================================
export type HttpStatusCode = typeof httpStatus[keyof typeof httpStatus];
export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];
export type UserPermission = typeof USER_PERMISSIONS[keyof typeof USER_PERMISSIONS];
export type OrderStatus = typeof ORDER_STATUS[keyof typeof ORDER_STATUS];
export type PaymentStatus = typeof PAYMENT_STATUS[keyof typeof PAYMENT_STATUS];
export type PaymentMethod = typeof PAYMENT_METHODS[keyof typeof PAYMENT_METHODS];
export type ProductCategory = typeof PRODUCT_CATEGORIES[keyof typeof PRODUCT_CATEGORIES];
export type EmailTemplate = typeof EMAIL_TEMPLATES[keyof typeof EMAIL_TEMPLATES];
export type Environment = typeof ENVIRONMENTS[keyof typeof ENVIRONMENTS];