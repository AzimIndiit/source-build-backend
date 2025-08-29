# CLAUDE.md - Source Build Backend

This file provides comprehensive guidance to Claude Code (claude.ai/code) when working with the Source Build e-commerce marketplace backend.

## 🚀 Quick Start Commands

### Development
```bash
npm run dev              # Start with hot reload (nodemon + ts-node)
npm run dev:debug        # Start with debugging enabled
npm run build           # Compile TypeScript to JavaScript
npm run start           # Run production build
```

### Code Quality
```bash
npm run lint            # Run ESLint with TypeScript rules
npm run lint:fix        # Fix auto-fixable linting issues
npm run format          # Format code with Prettier
npm run format:check    # Check formatting without fixing
npm run typecheck       # Run TypeScript compiler check
```

### Testing
```bash
npm test                # Run all tests with Jest
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Generate coverage report
npm run test:unit       # Run unit tests only
npm run test:integration # Run integration tests
npm run test:e2e        # Run end-to-end tests
```

### Documentation & API
```bash
npm run docs:generate   # Generate Swagger documentation
npm run docs:serve      # Serve Swagger UI locally
npm run postman:export  # Export Postman collection from Swagger
```

### Database
```bash
npm run db:seed         # Seed database with initial data
npm run db:reset        # Reset database (drop + seed)
npm run migration:run   # Run pending migrations
npm run migration:create # Create new migration
```

### Docker
```bash
docker-compose up -d    # Start all services in detached mode
docker-compose down     # Stop all services
docker-compose logs -f  # View logs for all services
```

## 📁 Architecture Overview

### Tech Stack
- **Node.js v20+** with **Express 5** framework
- **TypeScript 5.3+** with strict mode enabled
- **MongoDB** with **Mongoose ODM v8**
- **JWT** authentication (access + refresh tokens)
- **Redis** for caching and session management
- **Winston** for structured logging
- **Swagger/OpenAPI 3.0** for documentation
- **Jest + Supertest** for testing
- **Docker** for containerization

### Directory Structure
```
src/
├── config/              # Configuration management
│   ├── database.ts     # Database connection config
│   ├── redis.ts        # Redis connection config
│   ├── swagger.ts      # Swagger/OpenAPI config
│   ├── logger.ts       # Winston logger config
│   └── index.ts        # Central config with env validation
│
├── controllers/        # Request handlers (thin layer)
│   ├── auth/          # Authentication controllers
│   ├── products/      # Product controllers
│   ├── orders/        # Order controllers
│   ├── users/         # User management
│   ├── chat/          # Real-time chat
│   └── admin/         # Admin controllers
│
├── services/          # Business logic layer
│   ├── auth.service.ts
│   ├── product.service.ts
│   ├── order.service.ts
│   ├── payment.service.ts
│   ├── notification.service.ts
│   └── email.service.ts
│
├── models/            # MongoDB/Mongoose schemas
│   ├── user.model.ts
│   ├── product.model.ts
│   ├── order.model.ts
│   ├── chat.model.ts
│   └── index.ts
│
├── middlewares/       # Express middlewares
│   ├── auth.middleware.ts      # JWT verification
│   ├── error.middleware.ts     # Global error handler
│   ├── validation.middleware.ts # Request validation
│   ├── rateLimiter.middleware.ts
│   ├── cors.middleware.ts
│   └── logger.middleware.ts    # Request logging
│
├── routes/            # API route definitions
│   ├── v1/           # Version 1 API routes
│   │   ├── auth.routes.ts
│   │   ├── product.routes.ts
│   │   ├── order.routes.ts
│   │   └── index.ts
│   └── index.ts      # Route aggregator
│
├── utils/             # Utility functions
│   ├── ApiError.ts   # Custom error class
│   ├── ApiResponse.ts # Standardized response
│   ├── catchAsync.ts # Async error wrapper
│   ├── validators/   # Zod schemas
│   └── helpers/      # Helper functions
│
├── types/             # TypeScript type definitions
│   ├── express.d.ts  # Express type extensions
│   ├── environment.d.ts
│   └── models/       # Model interfaces
│
├── tests/             # Test files
│   ├── unit/         # Unit tests
│   ├── integration/  # Integration tests
│   ├── e2e/          # End-to-end tests
│   └── fixtures/     # Test data
│
├── docs/              # Documentation
│   ├── swagger/      # OpenAPI specs
│   └── postman/      # Postman collections
│
└── server.ts          # Application entry point
```

## 🔐 Authentication & Authorization

### JWT Token Strategy
- **Access Token**: 15 minutes expiry, stored in memory/headers
- **Refresh Token**: 7 days expiry, stored in httpOnly cookie
- Token rotation on refresh for security
- Blacklist mechanism for logout

### Role-Based Access Control (RBAC)
```typescript
enum UserRole {
  BUYER = 'buyer',
  SELLER = 'seller',
  DRIVER = 'driver',
  ADMIN = 'admin'
}

// Route protection example
router.get('/admin/users', 
  authenticate,
  authorize([UserRole.ADMIN]),
  controller
)
```

### OAuth Integration
- Google OAuth 2.0 with Passport.js
- Facebook Login SDK integration
- Apple Sign In (if needed)

## 🛡️ Security Best Practices

### Implemented Security Measures
- **Helmet.js** for security headers
- **CORS** with whitelist configuration
- **Rate limiting** per IP and user
- **Input sanitization** with express-mongo-sanitize
- **SQL injection protection** (MongoDB parameterized queries)
- **XSS protection** with DOMPurify
- **CSRF tokens** for state-changing operations
- **Request validation** with Zod schemas
- **Environment variables** validation with Joi
- **Secrets management** (never in code)

### API Security
```typescript
// All routes protected by default
app.use('/api', authenticate)

// Public routes explicitly marked
app.use('/api/public', publicRoutes)
```

## 📊 Database Architecture

### MongoDB Collections
- `users` - User accounts with roles
- `products` - Product catalog
- `orders` - Order management
- `chats` - Chat messages
- `notifications` - Push notifications
- `payments` - Payment records
- `reviews` - Product reviews
- `vehicles` - Driver vehicles

### Mongoose Best Practices
- Virtual properties for computed fields
- Indexes for query optimization
- Middleware for data validation
- Soft deletes with `deletedAt` field
- Audit fields (`createdBy`, `updatedBy`)
- Pagination with cursor-based approach

## 🔥 Error Handling

### Centralized Error Management
```typescript
class ApiError extends Error {
  statusCode: number
  isOperational: boolean
  
  constructor(statusCode: number, message: string) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = true
  }
}

// Global error handler
app.use(errorHandler)
```

### Error Response Format
```json
{
  "success": false,
  "error": {
    "message": "Validation failed",
    "code": "VALIDATION_ERROR",
    "statusCode": 400,
    "details": [...]
  },
  "timestamp": "2024-01-20T10:30:00Z",
  "path": "/api/v1/products"
}
```

## 📝 API Response Standards

### Success Response
```json
{
  "success": true,
  "data": {...},
  "message": "Product created successfully",
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 100
  }
}
```

### Pagination Format
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalPages": 5,
    "totalItems": 100,
    "hasNext": true,
    "hasPrev": false
  }
}
```

## 📋 Logging Strategy

### Winston Configuration
- **Levels**: error, warn, info, http, debug
- **Transports**: Console (dev), File (production), MongoDB
- **Format**: JSON in production, colorized in development
- **Rotation**: Daily rotation with 14d retention

### Log Structure
```json
{
  "timestamp": "2024-01-20T10:30:00Z",
  "level": "error",
  "message": "Database connection failed",
  "service": "auth-service",
  "userId": "123",
  "requestId": "abc-123",
  "stack": "..."
}
```

## 🧪 Testing Strategy

### Test Coverage Requirements
- Unit tests: 80% coverage minimum
- Integration tests: All API endpoints
- E2E tests: Critical user journeys

### Test Organization
```typescript
describe('AuthController', () => {
  describe('POST /login', () => {
    it('should return tokens for valid credentials', async () => {
      // Test implementation
    })
    
    it('should return 401 for invalid credentials', async () => {
      // Test implementation
    })
  })
})
```

## 📚 API Documentation

### Swagger/OpenAPI Integration
- Auto-generated from route decorators
- Hosted at `/api-docs`
- Includes request/response examples
- Authentication flow documented
- WebSocket events documented

### Postman Collection
- Auto-exported from Swagger
- Environment variables pre-configured
- Example requests for all endpoints
- Pre-request scripts for auth

## 🚀 Deployment Guidelines

### Environment Variables
```env
NODE_ENV=production
PORT=8000
MONGODB_URI=mongodb://...
JWT_SECRET=...
JWT_REFRESH_SECRET=...
REDIS_URL=redis://...
AWS_S3_BUCKET=...
STRIPE_SECRET_KEY=...
GOOGLE_CLIENT_ID=...
FACEBOOK_APP_ID=...
```

### Health Checks
- `/health` - Basic health check
- `/health/ready` - Readiness probe
- `/health/live` - Liveness probe

### Performance Optimization
- MongoDB connection pooling
- Redis caching for frequent queries
- CDN for static assets
- Compression middleware
- Query optimization with indexes

## 🔄 Development Workflow

### Git Branch Strategy
- `main` - Production-ready code
- `develop` - Integration branch
- `feature/*` - Feature branches
- `hotfix/*` - Emergency fixes

### Commit Convention
```
type(scope): subject

body (optional)

footer (optional)
```

Types: feat, fix, docs, style, refactor, test, chore

### Pre-commit Hooks (Husky)
- Linting check
- Format check
- Type checking
- Unit tests
- Commit message validation

## 🎯 Code Quality Rules

### TypeScript Guidelines
- Strict mode enabled
- No `any` types (use `unknown`)
- Explicit return types
- Interface over type alias
- Proper error typing

### Async/Await Pattern
```typescript
// Always use catchAsync wrapper
export const getProducts = catchAsync(async (req, res) => {
  const products = await productService.findAll(req.query)
  res.json(ApiResponse.success(products))
})
```

### Service Layer Pattern
```typescript
// Controllers are thin, services contain logic
class ProductService {
  async create(data: CreateProductDto): Promise<Product> {
    // Business logic here
    return await Product.create(data)
  }
}
```

## 🔧 Debugging & Monitoring

### Debug Mode
```bash
DEBUG=app:* npm run dev:debug
```

### APM Integration
- New Relic / DataDog integration ready
- Custom metrics tracking
- Performance monitoring
- Error tracking with Sentry

### Profiling
- CPU profiling with clinic.js
- Memory leak detection
- Query performance analysis

## 📦 Package Management

### Key Dependencies
```json
{
  "express": "^5.0.0",
  "mongoose": "^8.0.0",
  "jsonwebtoken": "^9.0.0",
  "bcryptjs": "^2.4.3",
  "winston": "^3.11.0",
  "swagger-jsdoc": "^6.2.0",
  "zod": "^3.22.0",
  "redis": "^4.6.0",
  "helmet": "^7.1.0",
  "cors": "^2.8.5",
  "express-rate-limit": "^7.1.0"
}
```

### Dev Dependencies
```json
{
  "typescript": "^5.3.0",
  "ts-node": "^10.9.0",
  "nodemon": "^3.0.0",
  "jest": "^29.7.0",
  "supertest": "^6.3.0",
  "@types/express": "^4.17.0",
  "eslint": "^8.56.0",
  "prettier": "^3.2.0",
  "husky": "^9.0.0"
}
```

## 🎓 Common Tasks

### Adding a New Feature
1. Create model in `src/models/`
2. Create service in `src/services/`
3. Create controller in `src/controllers/`
4. Add routes in `src/routes/v1/`
5. Add validation schemas in `src/utils/validators/`
6. Write tests in `src/tests/`
7. Update Swagger documentation
8. Export Postman collection

### Creating a New Endpoint
```typescript
// 1. Define route
router.post('/products',
  validateRequest(createProductSchema),
  authenticate,
  authorize([UserRole.SELLER]),
  productController.create
)

// 2. Controller
export const create = catchAsync(async (req, res) => {
  const product = await productService.create(req.body)
  res.status(201).json(ApiResponse.success(product))
})

// 3. Service
async create(data: CreateProductDto): Promise<Product> {
  return await Product.create(data)
}
```

### Database Migration
```bash
npm run migration:create -- AddIndexToProducts
npm run migration:run
npm run migration:rollback
```

## 💡 Performance Tips

### Query Optimization
- Use `.lean()` for read-only queries
- Select only needed fields with `.select()`
- Use pagination for large datasets
- Implement cursor-based pagination for feeds
- Cache frequently accessed data in Redis

### Memory Management
- Stream large files instead of loading
- Implement request size limits
- Use connection pooling
- Monitor memory usage with process.memoryUsage()

### API Performance
- Implement response caching
- Use compression for responses
- Implement field filtering
- Use database indexes effectively
- Batch operations when possible

## 🆘 Troubleshooting

### Common Issues

1. **MongoDB Connection Issues**
   - Check connection string
   - Verify network access
   - Check MongoDB service status

2. **JWT Token Errors**
   - Verify secret keys
   - Check token expiry
   - Validate token format

3. **CORS Errors**
   - Check allowed origins
   - Verify credentials flag
   - Check preflight requests

4. **Rate Limiting**
   - Check Redis connection
   - Verify rate limit settings
   - Clear rate limit cache if needed

### Debug Commands
```bash
# Check MongoDB connection
npm run db:ping

# Verify Redis connection
npm run redis:ping

# Test email service
npm run test:email

# Generate test JWT
npm run jwt:generate
```