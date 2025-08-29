# Source Build Backend - Authentication System

A comprehensive authentication system built with Node.js, TypeScript, Express, MongoDB, and Redis.

## Features

### Authentication & Authorization
- JWT-based authentication with access and refresh tokens
- Role-based access control (Buyer, Seller, Driver, Admin)
- Social login support (Google OAuth)
- Password reset functionality
- Email verification
- Account lockout protection
- Secure session management

### Security Features
- Password hashing with bcrypt
- Rate limiting
- Input sanitization (XSS, NoSQL injection protection)
- CORS configuration
- Security headers with Helmet
- Request logging and monitoring

### User Management
- Comprehensive user profiles
- Multiple address management
- User preferences and settings
- Social account linking
- Account status management

## Quick Start

### Prerequisites
- Node.js 20+
- Docker and Docker Compose (recommended)
- MongoDB 7.0+
- Redis 7.2+

### Using Docker (Recommended)

1. **Clone and setup environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

2. **Start MongoDB and Redis**
   ```bash
   docker-compose up -d mongodb redis
   ```

3. **Start development services (optional)**
   ```bash
   # Start MongoDB admin UI
   docker-compose --profile dev up -d mongo-express
   
   # Start Redis admin UI  
   docker-compose --profile dev up -d redis-commander
   ```

4. **Install dependencies and start development**
   ```bash
   npm install
   npm run dev
   ```

### Manual Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Setup environment**
   ```bash
   cp .env.example .env
   # Configure your MongoDB and Redis connections
   ```

3. **Start MongoDB and Redis**
   ```bash
   # Start your local MongoDB and Redis instances
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

## API Documentation

Once running, visit:
- **API Documentation**: http://localhost:3000/api-docs
- **Health Check**: http://localhost:3000/health

### Key Endpoints

#### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login user
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - Logout user
- `POST /api/v1/auth/google` - Google OAuth login

#### Password Management
- `POST /api/v1/auth/forgot-password` - Request password reset
- `POST /api/v1/auth/reset-password` - Reset password
- `POST /api/v1/auth/change-password` - Change password

#### Profile Management
- `GET /api/v1/auth/me` - Get user profile
- `PUT /api/v1/auth/me` - Update user profile

#### Email Verification
- `GET /api/v1/auth/verify-email/:token` - Verify email
- `POST /api/v1/auth/resend-verification` - Resend verification

## Docker Services

### Available Services
- **mongodb**: MongoDB 7.0 database
- **redis**: Redis 7.2 cache/session store
- **mongo-express**: MongoDB admin UI (port 8081)
- **redis-commander**: Redis admin UI (port 8082)

### Service Profiles
- **dev**: Development tools (admin UIs)
- **app**: Application container
- **production**: Production services
- **monitoring**: Prometheus & Grafana
- **logging**: Elasticsearch & Kibana

### Common Commands
```bash
# Start core services
docker-compose up -d mongodb redis

# Start with admin tools
docker-compose --profile dev up -d

# View logs
docker-compose logs -f mongodb
docker-compose logs -f redis

# Stop services
docker-compose down

# Remove volumes (clean slate)
docker-compose down -v
```

## Development

### Available Scripts
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

### Project Structure
```
src/
├── config/           # Configuration files
│   ├── database.ts   # Database connection
│   ├── logger.ts     # Winston logger setup
│   ├── swagger.ts    # API documentation
│   └── index.ts      # Environment config
├── controllers/      # Route controllers
│   └── auth/         # Authentication controllers
├── middlewares/      # Express middlewares
│   ├── auth.middleware.ts    # JWT & authorization
│   ├── logger.middleware.ts  # Request logging
│   └── error.ts      # Error handling
├── models/           # Mongoose models
│   └── user.model.ts # User schema and methods
├── routes/           # API routes
│   └── v1/           # API version 1
├── services/         # Business logic
│   └── auth.service.ts       # Authentication service
├── tests/            # Test files
│   └── setup.ts      # Test configuration
└── utils/            # Utility functions
```

## Environment Variables

Key environment variables (see `.env.example`):

```env
# Required
MONGODB_URI=mongodb://admin:password123@localhost:27017/sourcebuild?authSource=admin
JWT_SECRET=your-super-secret-jwt-key-that-should-be-at-least-32-characters
JWT_REFRESH_SECRET=your-super-secret-refresh-key-that-should-be-at-least-32-characters

# Optional
REDIS_URL=redis://:redis123@localhost:6379
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
SMTP_HOST=smtp.gmail.com
```

## Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test types
npm run test:unit
npm run test:integration
npm run test:e2e
```

## Production Deployment

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Use production Docker compose**
   ```bash
   docker-compose --profile production up -d
   ```

3. **Or deploy with your preferred method**
   ```bash
   NODE_ENV=production npm start
   ```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Run linting and tests
6. Submit a pull request

## Security Notes

- Always use strong JWT secrets (32+ characters)
- Enable rate limiting in production
- Use HTTPS in production
- Regularly update dependencies
- Monitor logs for suspicious activity
- Use environment variables for secrets

## License

MIT License - see LICENSE file for details