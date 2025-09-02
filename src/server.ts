import * as express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import session from 'express-session';
import MemoryStore from 'memorystore';
import rateLimit from 'express-rate-limit';
import passport from 'passport';
// import mongoSanitize from 'express-mongo-sanitize'; // Temporarily disabled - incompatible with Express 5

import config from './config/index.js';
import { connectDB } from './config/database.js';
import { setupSwagger } from './config/swagger.js';
import logger from './config/logger.js';
import loggerMiddleware from './middlewares/logger.middleware.js';
import { errorHandler, notFound } from './middlewares/error.js';
import apiRoutes from './routes/index.js';
import { displayBanner, displayStartupInfo, displayShutdownMessage, displayCompactLogo } from './utils/banner.js';
import { initializeSocketServer } from './services/socket.service.js';
import redisClient from './config/redis.config.js';
import kafkaService, { KafkaTopics } from './services/kafka.service.js';
import './config/passport.js'; // Initialize passport strategies

const app = express.default();

// Trust proxy for rate limiting behind reverse proxy
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.socket.io"],
      scriptSrcAttr: ["'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"],
    },
  },
}));

// Session middleware for OAuth role storage
const SessionStore = MemoryStore(session);
app.use(session({
  store: new SessionStore({
    checkPeriod: 86400000 // prune expired entries every 24h
  }),
  secret: config.SESSION_SECRET || 'development-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: config.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true,
    maxAge: 10 * 60 * 1000, // 10 minutes
    sameSite: config.NODE_ENV === 'production' ? 'strict' : 'lax', // Lax in development for OAuth
  },
  name: 'sessionId', // Custom session cookie name
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// CORS configuration
const corsOrigins = config.CORS_ORIGIN ? config.CORS_ORIGIN.split(',').map(origin => origin.trim()) : ['*'];
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) return callback(null, true);
    
    // Check if origin is in the allowed list or if '*' is allowed
    if (corsOrigins.includes('*') || corsOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // For development, allow all origins
      // callback(new Error('Not allowed by CORS')); // Use this in production
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Per-Page'],
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Data sanitization against NoSQL query injection
// app.use(mongoSanitize()); // Temporarily disabled - incompatible with Express 5

// Data sanitization against XSS (using express-validator in routes)
// Prevent parameter pollution is handled by input validation

// Compression middleware
app.use(compression());

// Logging middleware
app.use(loggerMiddleware.httpLogger);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.NODE_ENV === 'production' ? 100 : 1000, // Limit each IP
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Root welcome endpoint
app.get('/', (_req, res) => {
  res.json({
    status: 'success',
    message: 'Welcome to Source Build API',
    version: '1.0.0',
    endpoints: {
      api: '/api/v1',
      health: '/health',
      documentation: '/api-docs',
    },
    timestamp: new Date().toISOString(),
  });
});

// Health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    socket: {
      enabled: true,
      cors: config.SOCKET_CLIENT_URL || '*',
    },
  });
});

// Setup Swagger documentation
setupSwagger(app);

// Mount all API routes
app.use('/api', apiRoutes);

// Handle 404 errors
app.use(notFound);

// Global error handler
app.use(errorHandler);

const startServer = async (): Promise<void> => {
  try {
    // Clear console and display banner
    console.clear();
    displayBanner();
    
    // Connect to MongoDB
    await connectDB();
    
    // Connect to Redis (optional - will work without it)
    try {
      await redisClient.connect();
    } catch (error) {
      logger.warn('Redis connection failed, continuing without cache:', error);
      console.log('\x1b[33m  ⚠️  Redis Not Available - Running without cache\x1b[0m\n');
    }
    
    // Create HTTP server
    const httpServer = createServer(app);
    
    // Initialize Socket.IO FIRST (before Kafka)
    const io = initializeSocketServer(httpServer);
    logger.info('Socket.IO server initialized', {
      corsOrigin: config.SOCKET_CLIENT_URL || '*',
      timestamp: new Date().toISOString(),
    });
    console.log('\x1b[32m  ✅ Socket.IO Initialized: \x1b[0mPort ' + config.PORT);
    console.log(`  📊 Socket CORS: ${config.SOCKET_CLIENT_URL || '*'}\n`);
    
    // Initialize Kafka handlers (optional - will work without it)
    const { initializeKafkaHandlers } = await import('@/services/kafka-handlers.js');
    await initializeKafkaHandlers();
    
    // Start the HTTP server
    httpServer.listen(config.PORT, () => {
      logger.info('Server started successfully', {
        port: config.PORT,
        environment: config.NODE_ENV,
        nodeVersion: process.version,
        socketEnabled: true,
        timestamp: new Date().toISOString(),
      });
      
      // Display startup information
      displayStartupInfo(config.PORT);
      logger.info(`⚡ Socket.IO server listening on port ${config.PORT}`);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received. Shutting down gracefully...`);
      displayShutdownMessage();
      
      // Disconnect from Kafka
      try {
        await kafkaService.disconnect();
        logger.info('Kafka services disconnected');
      } catch (error) {
        logger.error('Error disconnecting Kafka:', error);
      }
      
      // Close Socket.IO connections
      io.close(() => {
        logger.info('Socket.IO server closed');
      });
      
      // Close HTTP server
      httpServer.close(() => {
        logger.info('HTTP server closed successfully');
        process.exit(0);
      });
    };

    process.on('SIGTERM', async () => await shutdown('SIGTERM'));
    process.on('SIGINT', async () => await shutdown('SIGINT'));
    
  } catch (error) {
    logger.error('Failed to start server', { error: error instanceof Error ? error.message : 'Unknown error' });
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}

export default app;