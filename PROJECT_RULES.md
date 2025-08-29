# 🚀 Project Rules – Source Build Backend

## Tech Stack
- Node.js v20+ with Express 5
- TypeScript 5.3+ (strict mode)
- MongoDB + Mongoose v8
- Redis for caching & sessions
- JWT (access + refresh tokens)
- Winston for logging
- Swagger/OpenAPI 3.0
- Jest + Supertest for testing
- Docker for containerization

## 🎯 Core Architecture Rules

### 1. Code Organization
- **ES Modules only** - No CommonJS (`import/export` not `require/module.exports`)
- **MVC Pattern** - Strict separation of concerns
- **Feature-based structure** - Group by business domain
- **Service layer pattern** - Business logic in services, not controllers
- **Repository pattern** - Database operations abstracted

### 2. TypeScript Rules
```typescript
// tsconfig.json strict settings
{
  "strict": true,
  "noImplicitAny": true,
  "strictNullChecks": true,
  "noUnusedLocals": true,
  "noUnusedParameters": true
}
```
- **No `any` type** - Use `unknown` or proper typing
- **Explicit return types** - All functions must declare return type
- **Interface over type** - Prefer interfaces for object shapes
- **Enums for constants** - Use enums for fixed sets of values

### 3. API Design Rules
- **RESTful conventions** - Proper HTTP verbs and status codes
- **Versioning** - All APIs under `/api/v1/`
- **Pagination** - Cursor-based for feeds, page-based for listings
- **Standardized responses** - Use `ApiResponse` wrapper
- **Error format** - Consistent error structure with codes

### 4. Security Rules
- **Authentication required by default** - Public routes explicitly marked
- **Role-based access control** - Check roles in middleware
- **Input validation** - Zod schemas for all inputs
- **Rate limiting** - Per endpoint and per user
- **Sanitization** - Clean all user inputs
- **No secrets in code** - Use environment variables

### 5. Database Rules
- **Mongoose strict mode** - Schema validation enabled
- **Indexes required** - Add indexes for queried fields
- **Soft deletes** - Use `deletedAt` field
- **Audit fields** - `createdBy`, `updatedBy`, timestamps
- **Transactions** - Use for multi-document operations
- **Lean queries** - Use `.lean()` for read-only operations

### 6. Testing Rules
- **80% coverage minimum** - For unit tests
- **Integration tests required** - For all endpoints
- **E2E tests** - For critical user flows
- **Test naming** - `should [expected behavior] when [condition]`
- **Mock external services** - Don't call real APIs in tests
- **Test data cleanup** - Clean database after each test

### 7. Error Handling Rules
- **Custom error classes** - Extend `ApiError`
- **Async error wrapper** - Use `catchAsync` for all async routes
- **Global error handler** - Centralized error middleware
- **Operational vs Programming errors** - Distinguish between types
- **No console.log** - Use Winston logger

### 8. Logging Rules
- **Structured logging** - JSON format in production
- **Request ID** - Track requests across services
- **Log levels** - error, warn, info, http, debug
- **No sensitive data** - Never log passwords, tokens
- **Performance metrics** - Log response times

## 📁 Folder Structure Requirements

```
src/
├── config/          # All configuration files
├── controllers/     # Request handlers (thin layer)
├── services/        # Business logic
├── models/          # Mongoose schemas
├── middlewares/     # Express middlewares
├── routes/          # Route definitions
├── utils/           # Utility functions
├── types/           # TypeScript definitions
├── validators/      # Zod schemas
└── tests/           # Test files
```

## 🔐 Authentication & Authorization

### JWT Strategy
```typescript
// Access token: 15 minutes
// Refresh token: 7 days
// Token rotation on refresh
// Blacklist for logout
```

### Role Hierarchy
```typescript
enum UserRole {
  ADMIN = 'admin',    // Full access
  SELLER = 'seller',  // Manage products, orders
  DRIVER = 'driver',  // Manage deliveries
  BUYER = 'buyer'     // Purchase products
}
```

## 📝 API Documentation

### Swagger Requirements
- **Auto-generated** - From decorators/comments
- **Examples required** - Request/response examples
- **Authentication documented** - OAuth flows included
- **Hosted at** `/api-docs`
- **Exportable** - To Postman collection

### Endpoint Naming
```
GET    /api/v1/products          # List
GET    /api/v1/products/:id      # Get one
POST   /api/v1/products          # Create
PUT    /api/v1/products/:id      # Update
DELETE /api/v1/products/:id      # Delete
```

## 🧪 Testing Standards

### Test Structure
```typescript
describe('ProductController', () => {
  describe('POST /api/v1/products', () => {
    it('should create product when valid data provided', async () => {})
    it('should return 400 when validation fails', async () => {})
    it('should return 401 when not authenticated', async () => {})
  })
})
```

### Test Categories
- `*.unit.test.ts` - Unit tests
- `*.integration.test.ts` - Integration tests
- `*.e2e.test.ts` - End-to-end tests

## 🚀 Development Workflow

### Branch Strategy
- `main` - Production
- `develop` - Development
- `feature/*` - New features
- `hotfix/*` - Emergency fixes

### Commit Messages
```
feat(auth): add OAuth login
fix(orders): resolve payment calculation
docs(api): update swagger definitions
test(products): add unit tests
refactor(services): extract email logic
```

### Pre-commit Checks
1. ESLint passes
2. Prettier formatted
3. TypeScript compiles
4. Tests pass
5. Coverage meets threshold

## 💻 Development Environment

### Required Tools
- Node.js v20+
- MongoDB 7+
- Redis 7+
- Docker & Docker Compose
- VS Code with extensions

### Environment Variables
```env
# Required in all environments
NODE_ENV=development
PORT=8000
MONGODB_URI=mongodb://localhost:27017/sourceuild
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret

# Required in production
REDIS_URL=redis://localhost:6379
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
STRIPE_SECRET_KEY=
```

## 🎯 Performance Requirements

### Response Times
- API endpoints: < 200ms (p95)
- Database queries: < 50ms
- Static assets: CDN cached

### Optimization Rules
- Pagination required for lists
- Caching for frequently accessed data
- Database connection pooling
- Compression for responses
- Lazy loading for references

## 📊 Monitoring & Logging

### Metrics to Track
- Response times
- Error rates
- Database query performance
- Memory usage
- CPU usage

### Alert Thresholds
- Error rate > 1%
- Response time > 500ms (p95)
- Memory usage > 80%
- Database connections > 80%

## 🔧 Code Quality Tools

### Linting & Formatting
```json
{
  "extends": ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  "rules": {
    "no-console": "error",
    "no-unused-vars": "error",
    "prefer-const": "error"
  }
}
```

### Prettier Config
```json
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5"
}
```

## 🚫 What NOT to Do

1. **Don't use callbacks** - Use async/await
2. **Don't use `var`** - Use `const` or `let`
3. **Don't commit secrets** - Use env variables
4. **Don't skip tests** - Write tests first
5. **Don't ignore errors** - Handle all errors
6. **Don't use synchronous operations** - Use async versions
7. **Don't mutate parameters** - Create new objects
8. **Don't use magic numbers** - Use named constants
9. **Don't mix concerns** - Separate layers
10. **Don't deploy without testing** - Run full test suite

## ✅ Checklist for New Features

- [ ] Model created with proper validation
- [ ] Service layer implements business logic
- [ ] Controller handles HTTP concerns only
- [ ] Routes properly secured with auth/roles
- [ ] Input validation with Zod schemas
- [ ] Unit tests written (80% coverage)
- [ ] Integration tests for endpoints
- [ ] Error handling implemented
- [ ] Logging added for debugging
- [ ] Documentation updated in Swagger
- [ ] Postman collection updated
- [ ] Performance tested under load
- [ ] Security review completed
- [ ] Code reviewed by team

## 📚 References

- [Express Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html)
- [MongoDB Best Practices](https://www.mongodb.com/docs/manual/administration/production-checklist/)
- [OWASP Security Guidelines](https://owasp.org/www-project-top-ten/)
- [12 Factor App](https://12factor.net/)